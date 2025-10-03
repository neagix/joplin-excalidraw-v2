/*eslint-disable */
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ExcalidrawLib from "@excalidraw/excalidraw";
import "./style.css";
import svgElementToString from '../util/svgElementToString'

let InitialData = {
  appState: { viewBackgroundColor: "#AFEEEE", currentItemFontFamily: 1 }
};

try {
  let el:HTMLInputElement = window.parent.document.getElementById('excalidraw_diagram_json') as HTMLInputElement;
  InitialData = JSON.parse(el.value);
} catch (d) {
  console.error("error: ", d)
}

const App = () => {
  const excalidrawWrapperRef = React.useRef(null);

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      {
        className: "excalidraw-wrapper",
        ref: excalidrawWrapperRef,
      },
      React.createElement(ExcalidrawLib.Excalidraw, {
        initialData: InitialData,
        // this function will serialize to JSON and export to SVG on each change
        // it is very inefficient but there is currently no way to perform these operations only when dialog is about to be closed
        onChange: async(elements, state) => {
          const excalidrawJson = ExcalidrawLib.serializeAsJSON(
            elements,
            state,
            {},
            "local"
          );
          (window.parent.document.getElementById('excalidraw_diagram_json') as HTMLInputElement).value = excalidrawJson;

          return ExcalidrawLib.exportToSvg({elements: elements, appState: state, files: null}).then(svgEle => {
            let svgString = svgElementToString(svgEle);
            (window.parent.document.getElementById('excalidraw_diagram_svg') as HTMLInputElement).value = svgString;
          });
        },
      },
      React.createElement(ExcalidrawLib.MainMenu, null, React.createElement(ExcalidrawLib.MainMenu.DefaultItems.ChangeCanvasBackground)))
    )
  );
};

const excalidrawWrapper = document.getElementById("app");

ReactDOM.render(React.createElement(App), excalidrawWrapper);
