import Templater from "../lib/Templater";

export function Simple() {
  const options = {
    template: "#my-template",
    elOrSelector: document
      .querySelector("#app")
      .appendChild(document.createElement("div")), // or just "#app"
    data: {
      title: "Hello World",
      message: "This is a templated message",
      headerclass: "header",
      ctr: 0,
      msgClass: "message",
    },
  };

  const templater = new Templater(options);

  templater.bindEvents({
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
  });

  setTimeout(() => {
    // Update data
    templater.updateData({
      // title: 'Hello World',
      message: "New message here...",
      color: "red",
    });
  }, 3000);
}
