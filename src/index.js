import { readFileSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { isAbsolute, getRootPath } from 'ethical-utility-path'
import { appendExtension, getAppPrefix } from 'ethical-utility-resolve-module'

export * from 'ethical-utility-resolve-module'

export const resolveNodeModuleFile = (file) => {
    const path = join(getNodeModulesPath(), file)
    return appendExtension(path)
}

export const generateModuleID = (path) => {
    const id = path.replace(getNodeModulesPath() + '/', '')
    if (isAbsolute(id)) {
        return path.replace(getRootPath(), getAppPrefix())
    }
    return id
}

export const getNodeModulesPath = () => (
    join(getRootPath(), 'node_modules')
)

export const resolveRelative = (a, b) => {
    return appendExtension(resolve(dirname(b), a))
}

export const resolveNodeModule = (name) => {
    const module = `${getNodeModulesPath()}/${name}/package.json`
    const { main, browser, files } = JSON.parse(readFileSync(module))
    const path = join(getNodeModulesPath(), name, browser || main || files[0])
    if (!browser) {
        console.warn(
            `The imported package (${name}) appears to not be a browser ` +
            'ready module and might behave unexpectedly if it attempts to ' +
            'use functionality that is exclusive to the Node.js environment.'
        )
    }
    return appendExtension(path)
}
