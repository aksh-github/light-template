export default class Templater {
  constructor(options) {
    this.template = options.template;
    this.data = options.data;
    // this.mountedElement =
    // this.mount(options.elOrSelector);
    this.boundNodes = {};
    this._eventListeners = []; // Track event listeners for cleanup

    this.compileTemplate();
    this.mount(options.elOrSelector);
  }

  compileTemplate() {
    const templateElement = document.querySelector(this.template);
    this.templateNode = templateElement.content.cloneNode(true);
    this.bindNodes(this.templateNode);
  }

  bindNodes(element) {
    if (element.childNodes) {
      Array.from(element.childNodes).forEach((child) => {
        // --- IF/ELSE HANDLING ---
        if (child.nodeType === 1 && child.hasAttribute("data-if")) {
          const expr = child.getAttribute("data-if");
          const show = this.resolvePath(this.data, expr);
          const next = child.nextElementSibling;
          if (show) {
            child.style.display = "";
            this.bindNodes(child);
            if (next && next.hasAttribute("data-else")) {
              next.style.display = "none";
            }
          } else {
            child.style.display = "none";
            if (next && next.hasAttribute("data-else")) {
              next.style.display = "";
              this.bindNodes(next);
            }
          }
          return; // Skip further processing for this child
        }

        if (child.nodeType === 1 && child.hasAttribute("data-for")) {
          // Handle for loop
          const forExpr = child.getAttribute("data-for"); // e.g. "item in items"
          const [, item, list] = forExpr.match(/(\w+)\s+in\s+(\w+)/) || [];
          if (item && list && Array.isArray(this.data[list])) {
            const parent = child.parentNode;
            const template = child.cloneNode(true);
            template.removeAttribute("data-for");

            // Store loop binding info for dynamic updates
            if (!this.loopBindings) this.loopBindings = {};
            this.loopBindings[list] = { parent, template, marker: child, item };

            this.data[list].forEach((val) => {
              const clone = template.cloneNode(true);

              // Replace bindings in attributes for all descendant elements
              const allDescendants = [clone, ...clone.querySelectorAll("*")];
              allDescendants.forEach((el) => {
                Array.from(el.attributes).forEach((attr) => {
                  attr.value = this.replaceBindingsInText(attr.value, {
                    ...this.data,
                    [item]: val,
                  });
                });
              });

              // Replace bindings in text nodes
              this.updateTextNodes(clone, {
                ...this.data,
                [item]: val,
              });

              parent.insertBefore(clone, child);
            });
            parent.removeChild(child);
          }
        } else if (child.nodeType === 3) {
          // Text node
          const text = child.textContent;
          child.originalText = text;
          child.textContent = this.replaceBindingsInText(text);
          const bindings = this.getBindings(text);
          if (bindings.length > 0) {
            bindings.forEach((binding) => {
              if (!this.boundNodes[binding]) {
                this.boundNodes[binding] = [];
              }
              this.boundNodes[binding].push({
                node: child,
                type: "text",
                original: text,
              });
            });
          }
        } else if (child.nodeType === 1) {
          // Element node
          Array.from(child.attributes).forEach((attribute) => {
            const attributeValue = attribute.nodeValue;
            const bindings = this.getBindings(attributeValue);
            if (bindings.length > 0) {
              bindings.forEach((binding) => {
                if (!this.boundNodes[binding]) {
                  this.boundNodes[binding] = [];
                }
                this.boundNodes[binding].push({
                  node: child,
                  type: "attribute",
                  attributeName: attribute.nodeName,
                  original: attributeValue,
                });
              });
              // Always use setAttribute for class
              if (attribute.nodeName === "class") {
                child.setAttribute(
                  "class",
                  this.replaceBindingsInText(attributeValue)
                );
              } else {
                attribute.nodeValue =
                  this.replaceBindingsInText(attributeValue);
              }
            }
          });
          this.bindNodes(child);
        }
      });
    }
  }

  getBindings(text) {
    // Support dot notation: {{ p.name }}
    const bindingRegex = /{{\s*([a-zA-Z0-9_$.]+)\s*}}/g;
    const matches = text.match(bindingRegex);
    if (matches) {
      return matches.map((match) => match.replace(/{{|}}/g, "").trim());
    } else {
      return [];
    }
  }

  // Helper to resolve nested properties
  resolvePath(obj, path) {
    return path.split(".").reduce((acc, part) => acc && acc[part], obj);
  }

  replaceBindingsInText(text, context = this.data) {
    // Support dot notation
    const bindingRegex = /{{\s*([a-zA-Z0-9_$.]+)\s*}}/g;
    return text.replace(bindingRegex, (match, property) => {
      const value = this.resolvePath(context, property);
      return value !== undefined ? value : "";
    });
  }

  // Add event listeners and track them
  bindEvents(events) {
    Object.keys(events).forEach((selector) => {
      const elements = this.mountedElement.querySelectorAll(selector);
      elements.forEach((element) => {
        Object.keys(events[selector]).forEach((eventName) => {
          const handler = events[selector][eventName].bind(this);
          element.addEventListener(eventName, handler);
          // Track for removal
          this._eventListeners.push({ element, eventName, handler });
        });
      });
    });
  }

  // Remove all tracked event listeners
  removeAllEventListeners() {
    this._eventListeners.forEach(({ element, eventName, handler }) => {
      element.removeEventListener(eventName, handler);
    });
    this._eventListeners = [];
  }

  updateBindings() {
    Object.keys(this.boundNodes).forEach((property) => {
      const nodes = this.boundNodes[property];
      nodes.forEach((node) => {
        node.textContent = node.originalText.replace(
          new RegExp(`{{\\s*${property}\\s*}}`, "g"),
          this.data[property]
        );
      });
    });
  }

  updateData(newData) {
    Object.assign(this.data, newData);

    // Update all text and attribute bindings with the latest data
    Object.keys(this.boundNodes).forEach((property) => {
      this.boundNodes[property].forEach((binding) => {
        if (binding.type === "text") {
          binding.node.textContent = this.replaceBindingsInText(
            binding.original,
            this.data
          );
        } else if (binding.type === "attribute") {
          const newValue = this.replaceBindingsInText(
            binding.original,
            this.data
          );
          if (binding.attributeName === "class") {
            // Always use setAttribute for class to preserve static and dynamic classes
            binding.node.setAttribute("class", newValue);
          } else {
            binding.node.setAttribute(binding.attributeName, newValue);
          }
        }
      });
    });

    // Re-render loops if needed
    if (this.loopBindings) {
      Object.keys(this.loopBindings).forEach((list) => {
        this.rerenderLoop(list);
      });
    }
  }

  // Helper to update all text nodes in a subtree
  updateTextNodes(root, context) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    let node;
    while ((node = walker.nextNode())) {
      if (typeof node.originalText === "undefined") {
        node.originalText = node.textContent;
      }
      node.textContent = this.replaceBindingsInText(node.originalText, context);
    }
  }

  // Call this before removing or re-rendering nodes
  rerenderLoop(list) {
    if (!this.loopBindings || !this.loopBindings[list]) return;
    const { parent, template, marker, item } = this.loopBindings[list];

    // Remove event listeners before removing nodes
    this.removeAllEventListeners();

    // Remove all previous loop nodes (except the marker/template)
    Array.from(parent.children).forEach((node) => {
      if (node !== marker && node.getAttribute("data-for") !== "true") {
        parent.removeChild(node);
      }
    });

    // Insert new nodes
    this.data[list].forEach((val) => {
      const clone = template.cloneNode(true);

      // Replace bindings in attributes for all descendant elements
      const allDescendants = [clone, ...clone.querySelectorAll("*")];
      allDescendants.forEach((el) => {
        Array.from(el.attributes).forEach((attr) => {
          attr.value = this.replaceBindingsInText(attr.value, {
            ...this.data,
            [item]: val,
          });
        });
      });

      // Replace bindings in text nodes
      this.updateTextNodes(clone, {
        ...this.data,
        [item]: val,
      });

      parent.appendChild(clone);
    });
  }

  mount(elOrSselector) {
    this.mountedElement =
      typeof elOrSselector === "string"
        ? document.querySelector(elOrSselector)
        : elOrSselector;
    this.mountedElement.appendChild(this.templateNode);
  }

  unmount() {
    this.removeAllEventListeners();
    if (this.mountedElement) {
      while (this.mountedElement.firstChild) {
        this.mountedElement.removeChild(this.mountedElement.firstChild);
      }
      this.mountedElement = null;
    }
  }
}
