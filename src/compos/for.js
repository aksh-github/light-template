import Templater from "../lib/Templater";

const t = new Templater({
  template: "#pandav-template",
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
});

t.bindEvents({
  // [data-id='toggle']
  button: {
    click: function () {
      console.log("Toggle button clicked!");
      t.updateData({ showPandavas: false });
      console.log(t.getRootElement().querySelector("[data-if]"));
      t.unmount(t.getRootElement().querySelector("[data-if]"));
    },
  },
});

// setTimeout(() => {
//   // Update data
//   t.updateData({
//     pandavas: [
//       { name: "Karna" },
//       { name: "Duryodhan" },
//       { name: "Shakuni" },
//       { name: "Ashwatthama" },
//     ],
//   });
// }, 7000);
