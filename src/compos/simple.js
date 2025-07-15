import Templater from "../lib/Templater";
let ct = 0;
export function Simple() {
  const options = {
    onMount: (root) => {
      console.log("Mounted element:", root);
      // You can perform additional setup here if needed
    },
    template: `<div data-id="{{id}}">
    <h2 class="{{headerclass}} list-item">Dynamic Template</h2>
      <p class="{{msgClass}}">{{ message }}</p>

      <input type="text" data-model="title" />
      <p class="{{msgClass}}">Title: {{title}}</p>
      <p>This is static text</p>

      <button data-id="neg">-</button> {{ctr}}
      <button data-id="pos">+ {{ctr}}</button>
      <hr />
      <MyCard name="{{title}}"></MyCard>
      <MyCard name="static string"></MyCard>
      </div>`,
    elOrSelector: document
      .querySelector("#app")
      .appendChild(document.createElement("div")), // or just "#app"
    data: {
      id: ct,
      title: "Hello World",
      message: "This is a templated message",
      headerclass: "header",
      ctr: 0,
      msgClass: "message",
    },
    events: {
      h2: {
        click: function () {
          console.log("Title clicked!");
        },
      },
      input: {
        input: function (event) {
          templater.updateData({ title: event.target.value });
        },
      },
      ".message": {
        mouseover: function () {
          console.log("Message hovered!");
        },
      },
      "[data-id='neg']": {
        click: function (event) {
          console.log("Button clicked!");
          templater.updateData({ ctr: options.data.ctr - 1 });
        },
      },
      "[data-id='pos']": {
        click: function (event) {
          console.log("Button clicked!");
          templater.updateData({ ctr: options.data.ctr + 1 });
        },
      },
    },
  };

  const templater = new Templater(options);

  // templater.bindEvents({
  //   h2: {
  //     click: function () {
  //       console.log("Title clicked!");
  //     },
  //   },
  //   input: {
  //     input: function (event) {
  //       templater.updateData({ title: event.target.value });
  //     },
  //   },
  //   ".message": {
  //     mouseover: function () {
  //       console.log("Message hovered!");
  //     },
  //   },
  //   "[data-id='neg']": {
  //     click: function (event) {
  //       console.log("Button clicked!");
  //       templater.updateData({ ctr: options.data.ctr - 1 });
  //     },
  //   },
  //   "[data-id='pos']": {
  //     click: function (event) {
  //       console.log("Button clicked!");
  //       templater.updateData({ ctr: options.data.ctr + 1 });
  //     },
  //   },
  // });

  setTimeout(() => {
    // Update data
    templater.updateData({
      // title: 'Hello World',
      message: "New message here...",
      color: "red",
    });
  }, 3000);
}
