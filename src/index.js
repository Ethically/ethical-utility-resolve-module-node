import clone from 'clone'
import { pathExistsSync } from 'fs-extra'
import { readFileSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { isAbsolute, isRelative, getRootPath } from 'ethical-utility-path'
import {
    appendExtension,
    getAppPrefix,
    isAbsolutePackage,
    isRelativePackage,
    isAppModule
} from 'ethical-utility-resolve-module'

const cache = {}
const browserMap = {}
const conflictMap = {}

export const getConflictMap = () => {
    return clone(conflictMap)
}

export const isConflicted = (request, parent) => {
    if (isRelative(request)) {
        return
    }
    const id = getModuleRootID(parent)
    const found = conflictMap[id] && conflictMap[id][request]
    if (found) {
        return found
    }
    resolveModulePath(request, parent)
    return conflictMap[id] && conflictMap[id][request]
}

const isPathConflicted = (path) => {
    return !!((path.match(/\/node_modules\//g) || []).length > 1)
}

const mapConflictDependecies = (request, parent, path) => {
    if (isRelative(request)) {
        return
    }
    const id = getModuleRootID(parent)
    if (!conflictMap[id]) {
        conflictMap[id] = {}
    }
    conflictMap[id][request] = generateModuleID(path)
}

const mapBrowserDependecies = (browser, parent) => {

    const id = getModuleRootID(parent)
    if (browserMap[id]) {
        return
    }

    const map = {}
    for (const request in browser) {
        const left = resolveBrowserRemap(request, parent)
        const right = resolveBrowserRemap(browser[request], parent)
        map[left] = right
    }
    if (map) {
        browserMap[id] = map
    }
}

export const getBrowserMap = () => {
    return clone(browserMap)
}

export const isRemapped = (request, parent) => {
    if (!parent) {
        return
    }

    const scope = getModuleRootID(parent)
    const key = resolveBrowserRemap(request, parent)
    const remapped = browserMap[scope] && browserMap[scope][key]
    if (remapped) {
        return remapped
    }
}

export const getModuleRootID = (module) => {
    return generateModuleID(getNodeModuleRoot(module))
}

const resolveBrowserRemap = (request, parent) => {
    if (!request) {
        return 'ethical-noop-module-empty/index.js'
    }
    if (isAbsolutePackage(request)) {
        return request
    }
    return generateModuleID(resolveModulePath(request, parent))
}

export const resolveRelative = (request, parent) => {
    return appendExtension(resolve(dirname(parent), request))
}

export const resolveNodeModuleFile = (request, parent) => {
    return appendExtension(join(getNodeModulesPath(), request))
}

const findPackageJSON = (name, parent = '') => {
    const packageJSON = name + '/package.json'
    let directories = parent.split('/')
    let index
    const nodeModules = 'node_modules'
    while ((index = directories.lastIndexOf(nodeModules)) > -1) {
        const parentRoot = directories.slice(0, index + 2).join('/')
        const dependency = parentRoot + '/'  + nodeModules + '/' + packageJSON
        if (pathExistsSync(dependency)) {
            return dependency
        }
        directories = directories.slice(0, index - 1)
    }
    return getNodeModulesPath() + '/' + packageJSON
}

const resolveBrowserFile = (packageJSON, packageJSONPath) => {
    const { name, main, browser } = packageJSON
    if (typeof browser === 'object') {
        mapBrowserDependecies(browser, packageJSONPath)
    } else if (typeof browser === 'string') {
        return browser
    } else {
        console.warn(
            `The imported package (${name}) appears to not be a browser ` +
            'ready module and might behave unexpectedly if it attempts to ' +
            'use functionality that is exclusive to the Node.js environment.'
        )
    }
    if (typeof main === 'string') {
        return main
    }
    return 'index.js'
}

const getPackageJSON = (packageJSONPath) => {
    if (cache[packageJSONPath]) {
        return cache[packageJSONPath]
    }
    return cache[packageJSONPath] = JSON.parse(readFileSync(packageJSONPath))
}

const resolveMainFile = (name, parent) => {
    const packageJSONPath = findPackageJSON(name, parent)
    const packageJSON = getPackageJSON(packageJSONPath)
    const packageRoot = dirname(packageJSONPath)
    return join(packageRoot, resolveBrowserFile(packageJSON, packageJSONPath))
}

export const resolveNodeModule = (request, parent) => {
    const path = resolveMainFile(request, parent)

    if (isPathConflicted(path)) {
        mapConflictDependecies(request, parent, path)
    }
    return appendExtension(path)
}

export const resolveModulePath = (request, parent) => {
    if (isAbsolutePackage(request)) return resolveNodeModule(request, parent)
    if (isRelativePackage(request)) return resolveNodeModuleFile(request)
    if (isRelative(request)) return resolveRelative(request, parent)
    return request
}

export const getNodeModulesPath = () => (
    join(getRootPath(), 'node_modules')
)

export const getNodeModuleRoot = (path) => {
    const nodeModules = 'node_modules'
    const parts = path.split('/')
    return parts.slice(0, parts.lastIndexOf(nodeModules) + 2).join('/')
}

export const generateModuleID = (path) => {
    const id = path.replace(getNodeModulesPath() + '/', '')
    if (isAbsolute(id)) {
        return path.replace(getRootPath(), getAppPrefix())
    }
    return id
}
