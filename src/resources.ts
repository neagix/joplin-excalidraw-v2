import joplin from 'api'
import { v4 as uuidv4 } from 'uuid'
import { tmpdir } from 'os'
import { sep, join } from 'path'
const fs = joplin.require('fs-extra')

const Config = {
    TempFolder: `${tmpdir}${sep}joplin-excalidraw-plugin${sep}`,
    TitlePrefix: 'excalidraw-'
}

export function generateId(): string {
    return uuidv4().replace(/-/g, '')
}

export function clearDiskCache(): void {
    if (fs.existsSync(Config.TempFolder)) {
        fs.rmSync(Config.TempFolder, { recursive: true })
    }
    fs.mkdirSync(Config.TempFolder, { recursive: true })
}

async function writeTmpFile(fileName: string, data: string): Promise<string> {
    const p = fileName.lastIndexOf('.');
    if (p === -1)
        // this is necessary for correct mime type detection
        throw new Error('file name is missing extension');
    const filePath = join(Config.TempFolder, fileName)

    await fs.writeFile(filePath, data)
    return filePath
}

export async function createDiagramResource(jsonResourceId:string, dataJson:string, dataSvg: string): Promise<string> {
    // will use a randomly generated id for the JSON, and a separate one for the SVG
    // this is necessary to have them stored as separate resources
    const jsonFn = Config.TitlePrefix + jsonResourceId + ".json";
    let jsonPath = await writeTmpFile(jsonFn, dataJson)
    await joplin.data.post(['resources'], null, { id: jsonResourceId, title: jsonFn }, [{ path: jsonPath }])
    fs.unlink(jsonPath);

    // the svg filename contains a reference to the JSON resource id
    const svgFn = Config.TitlePrefix + jsonResourceId + ".svg";
    let svgPath = await writeTmpFile(svgFn, dataSvg);
    const svgResourceId = generateId();
    await joplin.data.post(['resources'], null, { id: svgResourceId, title: svgFn }, [{ path: svgPath }])
    fs.unlink(svgPath);

    return svgResourceId
}

const convertedSvgPlaceholder = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 314 300" width="314" height="300"><!-- svg-source:excalidraw -->
<metadata></metadata><rect x="0" y="0" width="314" height="300" fill="#ffffff"></rect>
<g stroke-linecap="round" transform="translate(10 10) rotate(0 145 140)">
    <path d="M32 0 C102.33 -1.23, 177.71 -4.43, 261.77 0 C283.13 0.04, 292.7 9.06, 293.77 32 C293.87 97.19, 293.23 158.94, 293.77 249.18 C297.14 271.47, 282.09 284.16, 261.77 281.18 C184.08 280.51, 110.92 279.84, 32 281.18 C12.04 278.73, -3.49 267.99, 0 249.18 C-1.77 161.56, 0.24 76.88, 0 32 C0.91 13.51, 10.78 -1.16, 32 0" stroke="none" stroke-width="0" fill="#b2f2bb"></path>
    <path d="M32 0 C97.16 3.21, 159.51 2.27, 261.77 0 M32 0 C94.12 -0.24, 157.54 0.49, 261.77 0 M261.77 0 C281.99 -0.65, 294.6 11.49, 293.77 32 M261.77 0 C284.87 -0.88, 296.07 12.58, 293.77 32 M293.77 32 C294.94 83.07, 293.22 138.55, 293.77 249.18 M293.77 32 C294.8 114.34, 294.18 194.47, 293.77 249.18 M293.77 249.18 C295.52 271.06, 282.38 279.63, 261.77 281.18 M293.77 249.18 C293.11 272.76, 280.89 279.32, 261.77 281.18 M261.77 281.18 C211.69 278.39, 158.83 278.51, 32 281.18 M261.77 281.18 C183.3 279.83, 104.13 280.11, 32 281.18 M32 281.18 C12.3 282.62, -1.46 272.16, 0 249.18 M32 281.18 C10.54 281.79, 1.95 270.99, 0 249.18 M0 249.18 C-1.45 194.17, -2.47 138.08, 0 32 M0 249.18 C0.07 206.2, -0.24 161.33, 0 32 M0 32 C-1.6 9.87, 11.47 -0.61, 32 0 M0 32 C1.37 8.38, 11.75 -1.03, 32 0" stroke="#1e1e1e" stroke-width="2" fill="none"></path>
</g>
<g transform="translate(54.38525390625 98.09013366699219) rotate(0 102.5 52.5)">
    <text x="102.5" y="24.668" font-family="Excalifont, Xiaolai, sans-serif, Segoe UI Emoji" font-size="28px" fill="#1e1e1e" text-anchor="middle" style="white-space: pre;" direction="ltr" dominant-baseline="alphabetic">Edit &amp; Save</text><text x="102.5" y="59.668" font-family="Excalifont, Xiaolai, sans-serif, Segoe UI Emoji" font-size="28px" fill="#1e1e1e" text-anchor="middle" style="white-space: pre;" direction="ltr" dominant-baseline="alphabetic">to update this</text><text x="102.5" y="94.668" font-family="Excalifont, Xiaolai, sans-serif, Segoe UI Emoji" font-size="28px" fill="#1e1e1e" text-anchor="middle" style="white-space: pre;" direction="ltr" dominant-baseline="alphabetic">SVG preview</text>
</g>
</svg>
`;

export async function duplicateV1DiagramAsV2(v1JsonResourceId: string): Promise<string> {
    // load existing JSON data; cannot modify the existing resource because multiple notes might be using it
    const jsonData = await joplin.data.get(['resources', v1JsonResourceId, 'file']);
    const dataJson = Buffer.from(jsonData.body).toString('utf-8');

    const v2JsonResourceId = generateId();
    return createDiagramResource(v2JsonResourceId, dataJson, convertedSvgPlaceholder);
}

export async function getDiagramResource(resourceId: string): Promise<{ body: string,  dataJson:string }> {
    // get the title from the SVG resource, which contains the JSON resource id
    let resourceData = await joplin.data.get(['resources', resourceId], { fields: ['id', 'title'] });
    const jsonResourceId = resourceData.title.slice(0, resourceData.title.lastIndexOf('.')).slice(Config.TitlePrefix.length);

    // get the JSON corresponding resource
    const data = await joplin.data.get(['resources', jsonResourceId, 'file']);
    // necessary to convert the bytes array
    const dataJson = Buffer.from(data.body).toString('utf-8');
    return {
        body: '',
        dataJson: dataJson
    }
}

export async function updateDiagramResource(svgResourceId:string, dataJson:string, dataSvg: string): Promise<string> {
    // get the title from the SVG resource, which contains the JSON resource id
    let resourceData = await joplin.data.get(['resources', svgResourceId], { fields: ['id', 'title'] });
    let jsonFn = resourceData.title.slice(0, resourceData.title.lastIndexOf('.'));
    const jsonResourceId = jsonFn.slice(Config.TitlePrefix.length);
    const svgFn = jsonFn + ".svg";
    jsonFn += ".json";

    // resource id is the svg filename, thus convert to JSON
    const jsonPath = await writeTmpFile(jsonFn, dataJson);
    await joplin.data.put(['resources', jsonResourceId], null, {title: jsonFn}, [{ path: jsonPath}])
    fs.unlink(jsonPath);

    const svgPath = await writeTmpFile(svgFn, dataSvg);
    await joplin.data.put(['resources', svgResourceId], null, {title: svgFn}, [{ path: svgPath}])
    fs.unlink(svgPath);
    return svgResourceId
}
