import Templater from "../lib/Templater";

const t = new Templater({
  template: "#pandav-template",
  elOrSelector: "#for",
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
    "[data-id='toggle']": {
      click: function (event) {
        // Toggle by negating the current value
        this.updateData({
          showPandavas: !this.data.showPandavas,
        });
      },
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
