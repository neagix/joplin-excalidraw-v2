import joplin from 'api'
import { v4 as uuidv4 } from 'uuid';

import { ContentScriptType, ToolbarButtonLocation, MenuItem, MenuItemLocation } from 'api/types'
import { createDiagramResource, getDiagramResource, updateDiagramResource, clearDiskCache } from './resources';

const Config = {
  ContentScriptId: 'excalidraw-script',
}

const buildDialogHTML = (diagramBody: string): string => {
  return `
		<form name="main" style="display:none">
			<input type="" name="excalidraw_diagram_json"  id="excalidraw_diagram_json" value='${diagramBody}'>
			<input type="" name="excalidraw_diagram_svg"  id="excalidraw_diagram_svg" value=''>
		</form>
		`
}

function diagramMarkdown(diagramId: string) {
  return `![excalidraw.svg](:/${diagramId})`
}

const openDialog = async (diagramId: string, isNewDiagram: boolean): Promise<string | null> => {
  let diagramBody = "{}";
  const appPath = await joplin.plugins.installationDir();

  if (!isNewDiagram) {
    const diagramResource = await getDiagramResource(diagramId);
    diagramBody = diagramResource.dataJson;
  }

  let dialogs = joplin.views.dialogs;
  let diglogHandle = await dialogs.create(`excalidraw-dialog-${uuidv4()}`);

  let header = buildDialogHTML(diagramBody);
  let iframe = `<iframe id="excalidraw_iframe" style="position:absolute;border:0;width:100%;height:100%;" src="${appPath}\\local-excalidraw\\index.html" title="description"></iframe>`

  await dialogs.setHtml(diglogHandle, header + iframe);
  await dialogs.setButtons(diglogHandle, [
    { id: 'ok', title: 'Save' },
    { id: 'cancel', title: 'Close' }
  ]);
  await dialogs.setFitToContent(diglogHandle, false);

  let dialogResult = await dialogs.open(diglogHandle);
  if (dialogResult.id === 'ok') {
    if (isNewDiagram) {
      let diagramJson = dialogResult.formData.main.excalidraw_diagram_json;
      let diagramSvg = dialogResult.formData.main.excalidraw_diagram_svg;
      diagramId = await createDiagramResource(diagramJson, diagramSvg)
      await joplin.commands.execute('insertText', diagramMarkdown(diagramId))
    } else {
      let diagramJson = dialogResult.formData.main.excalidraw_diagram_json;
      let diagramSvg = dialogResult.formData.main.excalidraw_diagram_svg;
      await updateDiagramResource(diagramId, diagramJson, diagramSvg)
    }
  }

  return diagramId;
}

joplin.plugins.register({
  onStart: async () => {

    const installDir = await joplin.plugins.installationDir();
    const excalidrawCssFilePath = installDir + '/excalidraw.css';
    await (joplin as any).window.loadChromeCssFile(excalidrawCssFilePath);

    clearDiskCache();

    /* support excalidraw dialog */
    await joplin.contentScripts.register(
      ContentScriptType.MarkdownItPlugin,
      Config.ContentScriptId,
      // './contentScript.js'
      './contentScripts/markdownIt.js',
    );

    await joplin.contentScripts.onMessage(Config.ContentScriptId, async (message: any) => {
      // Extract the ID
      const fileURLMatch = /^(?:file|joplin[-a-z]+):\/\/.*\/([a-zA-Z0-9]+)[.]\w+(?:[?#]|$)/.exec(message);
      const resourceLinkMatch = /^:\/([a-zA-Z0-9]+)$/.exec(message);

      let resourceId: string | null = null;
      if (fileURLMatch) {
        resourceId = fileURLMatch[1];
       } else if (resourceLinkMatch) {
        resourceId = resourceLinkMatch[1];
      }

      if(resourceId == null){

      }

      return (await openDialog(resourceId, false));
    });

    await joplin.commands.register({
      name: 'addExcalidraw',
      label: 'add excalidraw panel',
      iconName: 'icon-excalidraw-plus-icon-filled',
      execute: async () => {
        openDialog("", true);
      }
    });

    await joplin.views.toolbarButtons.create('addExcalidraw', 'addExcalidraw', ToolbarButtonLocation.EditorToolbar);
  },
})
