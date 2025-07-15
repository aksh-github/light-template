// --- Component registry ---
const COMPONENTS = {};

// Register a component
export function registerComponent(name, classConfig) {
  COMPONENTS[name.toUpperCase()] = classConfig;
}

// Helper: parse attributes to props
function getPropsFromAttributes(node) {
  const props = {};
  for (const attr of node.attributes) {
    props[attr.name] = attr.value;
  }
  return props;
}

// Helper: process custom components in a DOM subtree
function processComponents(root) {
  if (!root) return;
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT,
    null,
    false
  );
  let node = walker.currentNode;

  while (node) {
    const tag = node.tagName;
    const config = COMPONENTS[tag];
    if (config) {
      const props = getPropsFromAttributes(node);
      // console.log(config, props);
      // const comp = new config(props);
      // Get component config and merge props
      const componentConfig = typeof config === "function" ? config() : config;
      const inst = createTemplater({
        ...componentConfig,
        data: {
          ...componentConfig,
          ...props,
        },
      });

      let rendered = inst.templateNode;
      // console.log(inst);
      node.replaceWith(rendered);
      // Restart walker from rendered node
      walker.currentNode = rendered;
      rendered = null;
    }
    node = walker.nextNode();
  }
}

// --- Patch compileTemplate to process components ---
export default class Templater {
  constructor(options) {
    this.template = options.template;

    this.data = options.data;
    // this.mountedElement =
    // this.mount(options.elOrSelector);
    this.boundNodes = {};
    this._eventListeners = []; // Track event listeners for cleanup

    this.compileTemplate();

    if (options.elOrSelector) this.mount(options.elOrSelector);

    options?.onMount?.(this.mountedElement);
    if (options.events) {
      this.bindEvents(options.events);
    }
    this.unMountFn = options?.onUnmount || (() => {});
  }

  compileTemplate() {
    const templateElement = `${this.template.trim()}`; // Placeholder for template
    const node = new DOMParser().parseFromString(templateElement, "text/html");
    if (!node || !node.body) {
      throw new Error("Invalid template string provided");
    }
    // Use the whole body, not just firstChild
    this.templateNode = node.body;
    // --- Component processing step ---
    processComponents(this.templateNode);
    // Use firstChild for mounting
    this.templateNode = this.templateNode.firstChild.cloneNode(true);

    this.bindNodes(this.templateNode);
  }

  bindNodes(element) {
    if (element.childNodes) {
      Array.from(element.childNodes).forEach((child) => {
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
                original: text?.replaceAll("\n", "").replaceAll("\t", ""),
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

    console.log(this.boundNodes);

    // Update all text and attribute bindings with the latest data
    Object.keys(this.boundNodes).forEach((property) => {
      this.boundNodes[property].forEach((binding) => {
        if (binding.type === "text") {
          const newText = this.replaceBindingsInText(
            binding.original,
            this.data
          );
          if (binding.node.textContent !== newText) {
            binding.node.textContent = newText;
          }
        } else if (binding.type === "attribute") {
          const newValue = this.replaceBindingsInText(
            binding.original,
            this.data
          );
          if (binding.attributeName === "class") {
            if (binding.node.getAttribute("class") !== newValue) {
              binding.node.setAttribute("class", newValue);
            }
          } else {
            if (binding.node.getAttribute(binding.attributeName) !== newValue) {
              binding.node.setAttribute(binding.attributeName, newValue);
            }
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

  getRootElement() {
    return this.mountedElement;
  }

  mount(elOrSselector) {
    this.mountedElement =
      typeof elOrSselector === "string"
        ? document.querySelector(elOrSselector)
        : elOrSselector;
    this.mountedElement.appendChild(this.templateNode);
  }

  unmount(_node) {
    if (!_node) {
      this.unMountFn(this.mountedElement);
      this.removeAllEventListeners();
    }
    let node = _node || this.mountedElement;
    this.data = null;

    if (node) {
      while (node.firstChild) {
        node.removeChild(node.firstChild);
      }
      node = null;
    }

    if (!_node) this.mountedElement = null;
  }
}

export function createTemplater(options) {
  return new Templater(options);
}

// --- Example usage ---
// Define a component class
class MyCard {
  constructor(props) {
    this.props = props;
  }
  render() {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<h2>Hello, ${this.props.name}!</h2>
    <p>This is a custom card component.</p>`;
    return div;
  }
}

// const mc = createTemplater({
//   template: `<div>
//   <h2>Hello, {this.props.name}!</h2>
//     <p>This is a custom card component.</p>
//     </div>`,
//   // elOrSelector: document.querySelector("#app"),
//   onMount: (el) => {
//     console.log(el);
//   },
//   data: {},
// });

// Register the component
let ctr = 0;
registerComponent("MyCard", () => ({
  template: `<div id="mc-{{id}}">
  <h2>Hello, {{id}} {{name}}!</h2>
    <p>This is a custom card component.</p>
    </div>`,
  // elOrSelector: document.querySelector("#app"),
  onMount: (el) => {
    console.log(el);
    ctr++;
  },
  data: {
    name: "",
    id: ctr,
  },
}));

// Now you can use <MyCard name="second" /> in your template string!
