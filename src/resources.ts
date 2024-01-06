import joplin from 'api'
import { v4 as uuidv4 } from 'uuid'
import { tmpdir } from 'os'
import { sep } from 'path'
const fs = joplin.require('fs-extra')

const Config = {
    TempFolder: `${tmpdir}${sep}joplin-excalidraw-plugin${sep}`,
    TitlePrefix: 'excalidraw-',
    IdPrefix: 'excl_'
}

export interface IDiagramOptions {
    sketch?: boolean
}

function generateId() {
    return uuidv4().replace(/-/g, '')
}

function buildTitle(dataType: string): string {
    return Config.TitlePrefix + Date.parse(new Date().toString()) + '-' + dataType;
}

export function clearDiskCache(): void {
    if (fs.existsSync(Config.TempFolder)) {
        fs.rmSync(Config.TempFolder, { recursive: true })
    }
    fs.mkdirSync(Config.TempFolder, { recursive: true })
}

async function writeJsonFile(name: string, data: string, filePath: string = null): Promise<string> {
    if (!filePath) {
        filePath = `${Config.TempFolder}${name}.json`
    }
    await fs.writeFile(filePath, data)
    return filePath
}

async function writeSvgFile(name:string, svgData: string, filePath: string = null) : Promise<string> {
    if (!filePath) {
        filePath = `${Config.TempFolder}${name}.svg`
    }
    await fs.writeFile(filePath, svgData)
    return filePath
}

export async function getDiagramResource(diagramId: string): Promise<{ body: string,  dataJson:string }> {
    let resourceData = await joplin.data.get(['resources', diagramId], { fields: ['id', 'title'] });
    let dataId = resourceData.title;
    const data = await joplin.data.get(['resources', dataId, 'file']);
    const dataJson = Buffer.from(data.body).toString('utf-8');
    // let resourceData = await joplin.data.get(['resources', dataId], { fields: ['id', 'path'] });
    // let dataJson = await fs.readFile(resourceData.path);
    return {
        body: '',
        dataJson: dataJson
    }
}

export async function updateDiagramResource(diagramId:string, dataJson:string, dataSvg: string): Promise<string> {
    let resourceData = await joplin.data.get(['resources', diagramId], { fields: ['id', 'title'] });
    let dataId = resourceData.title;
    let filePath = await writeJsonFile(dataId, dataJson)
    await joplin.data.put(['resources', dataId], null, {title: buildTitle('json')}, [{ path: filePath}])
    let svgPath = await writeSvgFile(diagramId, dataSvg);
    await joplin.data.put(['resources', diagramId], null, {title: dataId}, [{ path: svgPath}])
    return diagramId
}


export async function createDiagramResource(dataJson:string, dataSvg: string): Promise<string> {
    let dataId = generateId();
    let filePath = await writeJsonFile(dataId, dataJson);
    await joplin.data.post(['resources'], null, { id: dataId, title: buildTitle('json') }, [{ path: filePath }])
    // let diagramId = Config.IdPrefix + dataId.substring(Config.IdPrefix.length);
    let diagramId = generateId();
    let svgPath = await writeSvgFile(diagramId, dataSvg)
    await joplin.data.post(['resources'], null, { id: diagramId, title: dataId }, [{ path: svgPath }])

    return diagramId
}

export async function isDiagramResource(diagramId: string): Promise<boolean> {
    let resourceProperties = await joplin.data.get(['resources', diagramId])
    return resourceProperties.title.startsWith(Config.TitlePrefix)
}