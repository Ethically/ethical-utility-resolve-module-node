import requireHacker from 'require-hacker'
import { readFileSync } from 'fs'
import { join } from 'path'
import chai from 'chai'
import spies from 'chai-spies'
import {
    getNodeModulesPath,
    resolveRelative,
    resolveNodeModule,
    resolveNodeModuleFile,
    resolveModulePath,
    generateModuleID,
    getBrowserMap,
    getConflictMap
} from '../../src/index.js'

const { expect } = chai
chai.use(spies)

const appRoot = process.cwd()
const nodeModulesPath = join(appRoot, '/node_modules/')
const vendorModule = join(nodeModulesPath, 'vendor', 'index.js')
const appModule = join(appRoot, 'app.js')
const appNodeModule = join(nodeModulesPath, 'app', 'index.js')

describe('generateModuleID()', () => {
    it('should transform absolute app file', () => {
        expect(generateModuleID(appModule)).to.equal('~/app.js')
    })
    it('should transform absolute node app file', () => {
        expect(generateModuleID(appNodeModule)).to.equal('app/index.js')
    })
})

describe('resolveRelative()', () => {
    it('should resolve a file relative to another', () => {
        expect(resolveRelative('./relative.js', appModule))
        .to.equal(appModule.replace('app.js', 'relative.js'))
    })
    it('should append extension', () => {
        expect(resolveRelative('./relative', appModule))
        .to.equal(appModule.replace('app.js', 'relative.js'))
    })
})

describe('resolveNodeModule()', () => {
    it('should resolve modules with version conflicts', () => {
        const module = 'ethical-noop-module-conflict'
        const hacker = requireHacker.global_hook('*', (module, parent) => {
            if (module.endsWith('.json')) {
                return
            }
            const { id } = parent
            const path = resolveModulePath(module, id)
            const source = readFileSync(path, 'utf8')
            return { source, path }
        })
        const result = require(module)
        const conflictMap = {
            "ethical-noop-module-conflict": {
                "ethical-noop-module-conflict-sub": "ethical-noop-module-conflict/node_modules/ethical-noop-module-conflict-sub/index.js"
            },
            "ethical-noop-module-conflict/node_modules/ethical-noop-module-conflict-sub": {
                "ethical-noop-module-conflict": "ethical-noop-module-conflict/node_modules/ethical-noop-module-conflict-sub/node_modules/ethical-noop-module-conflict/index.js"
            },
            "ethical-noop-module-conflict/node_modules/ethical-noop-module-conflict-sub/node_modules/ethical-noop-module-conflict": {
                "ethical-noop-module-conflict-sub": "ethical-noop-module-conflict/node_modules/ethical-noop-module-conflict-sub/node_modules/ethical-noop-module-conflict/node_modules/ethical-noop-module-conflict-sub/index.js"
            }
        }
        expect(result).to.equal('Bottom of the rabbit hole!')
        expect(getConflictMap()).to.deep.equal(conflictMap)
        hacker.unmount()
    })
    it('should resolve a node module to its browser entry file', () => {
        const module = 'ethical-noop-module-browser-spec'
        resolveNodeModule(module)
        const browserMap =  {
            'ethical-noop-module-browser-spec': {
                'ethical-noop-module-node': 'ethical-noop-module-browser',
                'ethical-noop-module-one': 'ethical-noop-module-browser-spec/browser.js',
                'ethical-noop-module-browser-spec/remap.js': 'ethical-noop-module-two',
                'ethical-noop-module-browser-spec/node/file.js': 'ethical-noop-module-browser-spec/browser/file.js',
                'ethical-noop-module-browser-spec/noop.js': 'ethical-noop-module-empty/index.js'
            }
        }
        expect(getBrowserMap()).to.deep.equal(browserMap)
    })
    it('should resolve a node module to its browser entry file', () => {
        const module = 'ethical-noop-module-browser'
        const entry = join(nodeModulesPath, module, '/browser.js')
        expect(resolveNodeModule(module)).to.equal(entry)
    })
    it('should resolve node entry file and warm user of consequences', () => {
        const module = 'ethical-noop-module-node'
        const entry = join(nodeModulesPath, module, '/index.js')
        const originalConsoleWarn = console.warn
        const consoleWarnSpy = chai.spy('console.warn')
        console.warn = (text) => {
            consoleWarnSpy()
            expect(text.length).to.be.above(0)
        }
        expect(resolveNodeModule(module)).to.equal(entry)
        console.warn = originalConsoleWarn
        expect(consoleWarnSpy).to.have.been.called()
    })
})

describe('resolveNodeModuleFile()', () => {
    it('should resolve a relative node module file', () => {
        const moduleFile = join('ethical-noop-module-browser', 'browser.js')
        const resolvedFile = join(nodeModulesPath, moduleFile)
        expect(resolveNodeModuleFile(moduleFile)).to.equal(resolvedFile)
    })
})
