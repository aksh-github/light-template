import { createTemplater } from "../lib/Templater";

const t = createTemplater({
  // templateNode: document.querySelector("#pandav-template"),
  template: `
      <div>
      <p>
        <button data-id="toggle">Toggle Pandavas</button>
      </p>
      <div data-if="showPandavas">
        <ul>
          <li class="list-item" data-for="p in pandavas">{{p.name}}</li>
        </ul>
      </div>
      <div data-else>
        <p>No Pandavas to show.</p>
      </div>
      </div>
    `,
  elOrSelector: document.querySelector("#for"),
  data: {
    showPandavas: true,
    pandavas: [
      { name: "Yudhishthir" },
      { name: "Arjun" },
      { name: "Bheem" },
      { name: "Nakula" },
      { name: "Sahadev" },
    ],
  },
  events: {
    // [data-id='toggle']
    button: {
      click: function () {
        console.log("Toggle button clicked!");
        t.updateData({ showPandavas: false });
        console.log(t.getRootElement().querySelector("[data-if]"));
        t.unmount(t.getRootElement().querySelector("[data-if]"));
      },
    },
  },
});

// t.bindEvents({
//   // [data-id='toggle']
//   button: {
//     click: function () {
//       console.log("Toggle button clicked!");
//       t.updateData({ showPandavas: false });
//       console.log(t.getRootElement().querySelector("[data-if]"));
//       t.unmount(t.getRootElement().querySelector("[data-if]"));
//     },
//   },
// });

setTimeout(() => {
  // Update data
  t.updateData({
    pandavas: [
      { name: "Karna" },
      { name: "Duryodhan" },
      { name: "Shakuni" },
      { name: "Ashwatthama" },
    ],
  });
}, 7000);
