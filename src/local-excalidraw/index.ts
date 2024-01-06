/*eslint-disable */
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ExcalidrawLib from "@excalidraw/excalidraw";
import toast, { Toaster } from 'react-hot-toast';
import "./style.css";
import svgElementToString from '../util/svgElementToString'

let excalidrawJson = "{}";
let excalidrawData = {
  elements: null,
  appState: null
};

let InitialData = {
  appState: { viewBackgroundColor: "#AFEEEE", currentItemFontFamily: 1 }
};

try {
  let el:HTMLInputElement = window.parent.document.getElementById('excalidraw_diagram_json')  as HTMLInputElement;
  InitialData = JSON.parse((el as HTMLInputElement).value);
} catch (d) {
  console.error("error: ", d)
}

const renderSvg = () => {
  if(excalidrawData.elements && excalidrawData.appState){
    ExcalidrawLib.exportToSvg({elements: excalidrawData.elements, appState: excalidrawData.appState, files: null}).then(svgEle => {
      let svgString = svgElementToString(svgEle);
      (window.parent.document.getElementById('excalidraw_diagram_svg') as HTMLInputElement).value = svgString;
      // show a tip
      toast.success('render svg ok!')
    })
  }else{
    toast.error('no excalidraw json data!!')
  }
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
        renderTopRightUI: () =>React.createElement(
            "button",
            {
              className: "excalidraw-render-svg",
              ref: excalidrawWrapperRef,
              onClick : renderSvg
            },
            "Render SVG"
        ),
        onChange: (elements, state) => {
          excalidrawData.elements = elements;
          excalidrawData.appState = state;
          excalidrawJson = (ExcalidrawLib as any).serializeAsJSON(
            elements,
            state
          );
          (window.parent.document.getElementById('excalidraw_diagram_json') as HTMLInputElement).value = excalidrawJson;
        },
      },React.createElement(ExcalidrawLib.MainMenu, null, 
        React.createElement(ExcalidrawLib.MainMenu.DefaultItems.ChangeCanvasBackground))),
      React.createElement(Toaster)
    )
  );
};

const excalidrawWrapper = document.getElementById("app");

ReactDOM.render(React.createElement(App), excalidrawWrapper);
