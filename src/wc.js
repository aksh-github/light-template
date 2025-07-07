class WcDev extends HTMLElement {
  constructor() {
    super();
    // const shadow = this.attachShadow({ mode: "open" });
    this.innerHTML = `
            
            <div class="wc-test">
                This div is for web comp test
            </div>
        `;
  }
}

customElements.define("wc-dev", WcDev);
