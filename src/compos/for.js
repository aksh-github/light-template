import Templater from "../lib/Templater";

const t = new Templater({
  template: "#pandav-template",
  elOrSelector: "#for",
  data: {
    showPandavas: true, // Control visibility of pandavas
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
  "[data-id='toggle']": {
    click: function (event) {
      console.log(t.data);
      console.log("Toggle button clicked!");
      t.updateData({ showPandavas: !t.data.showPandavas });
    },
  },
});

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
