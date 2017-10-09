import { join } from 'path'
import {
    getNodeModulesPath,
    resolveRelative,
    resolveNodeModule,
    resolveNodeModuleFile,
    generateModuleID
} from '../../src/index.js'

const appRoot = process.cwd()
const nodeModulesPath = join(appRoot, '/node_modules/')
const vendorModule = join(nodeModulesPath, 'vendor', 'index.js')
const appModule = join(appRoot, 'app.js')
const appNodeModule = join(nodeModulesPath, 'app', 'index.js')

describe('generateModuleID()', () => {
    it('should transform absolute app file', () => {
        expect(generateModuleID(appModule)).toBe('~/app.js')
    })
    it('should transform absolute node app file', () => {
        expect(generateModuleID(appNodeModule)).toBe('app/index.js')
    })
})

describe('resolveRelative()', () => {
    it('should resolve a file relative to another', () => {
        expect(resolveRelative('./relative.js', appModule))
        .toBe(appModule.replace('app.js', 'relative.js'))
    })
    it('should append extension', () => {
        expect(resolveRelative('./relative', appModule))
        .toBe(appModule.replace('app.js', 'relative.js'))
    })
})

describe('resolveNodeModule()', () => {
    it('should resolve a node module to its browser entry file', () => {
        const module = 'ethical-noop-module-browser'
        const entry = join(nodeModulesPath, module, '/browser.js')
        expect(resolveNodeModule(module)).toBe(entry)
    })
    it('should resolve node entry file and warm user of consequences', () => {
        const module = 'ethical-noop-module-node'
        const entry = join(nodeModulesPath, module, '/index.js')
        const originalConsoleWarn = console.warn
        const consoleWarnSpy = jasmine.createSpy('console.warn')
        console.warn = (text) => {
            consoleWarnSpy()
            expect(text.length).toBeGreaterThan(0)
        }
        expect(resolveNodeModule(module)).toBe(entry)
        console.warn = originalConsoleWarn
        expect(consoleWarnSpy).toHaveBeenCalled()
    })
    it('should resolve node entry file out of "files" and warm user of consequences', () => {
        const module = 'ethical-noop-module-files'
        const entry = join(nodeModulesPath, module, '/files.js')
        const originalConsoleWarn = console.warn
        const consoleWarnSpy = jasmine.createSpy('console.warn')
        console.warn = (text) => {
            consoleWarnSpy()
            expect(text.length).toBeGreaterThan(0)
        }
        expect(resolveNodeModule(module)).toBe(entry)
        console.warn = originalConsoleWarn
        expect(consoleWarnSpy).toHaveBeenCalled()
    })
})

describe('resolveNodeModuleFile()', () => {
    it('should resolve a relative node module file', () => {
        const moduleFile = join('ethical-noop-module-browser', 'browser.js')
        const resolvedFile = join(nodeModulesPath, moduleFile)
        expect(resolveNodeModuleFile(moduleFile)).toBe(resolvedFile)
    })
})
