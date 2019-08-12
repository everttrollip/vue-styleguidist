import * as path from 'path'
import { writeDownMdFile, compileMarkdown } from '../utils'
import extractConfig, { DocgenCLIConfig } from '../extractConfig'

const UGLY_MD = 'ugly'
const PRETTY_MD = 'pretty'
const MD_FILE_PATH = 'test/file'

jest.mock('chokidar', () => ({
	watch: jest.fn()
}))

var mockFs: {
	readFile: jest.Mock
	writeFile: jest.Mock
	existsSync: jest.Mock
}
jest.mock('fs', () => {
	mockFs = {
		readFile: jest.fn((a, b, c) => c()),
		writeFile: jest.fn((a, b, c) => c()),
		existsSync: jest.fn(() => false)
	}
	return mockFs
})

var mockPrettierFormat: jest.Mock
jest.mock('prettier', () => {
	mockPrettierFormat = jest.fn(() => PRETTY_MD)
	return {
		format: mockPrettierFormat
	}
})

var mockMkdirp: jest.Mock
jest.mock('mkdirp', () => {
	mockMkdirp = jest.fn((p, c) => c())
	return mockMkdirp
})

var mockCompileTemplates: jest.Mock
jest.mock('../compileTemplates', () => {
	mockCompileTemplates = jest.fn()
	return mockCompileTemplates
})

describe('writeDownMdFile', () => {
	it('should pretify before saving', async done => {
		await writeDownMdFile(UGLY_MD, MD_FILE_PATH)
		expect(mockPrettierFormat).toHaveBeenCalledWith(UGLY_MD, { parser: 'markdown' })
		done()
	})

	it('should then save the pretified markdown', async done => {
		await writeDownMdFile(UGLY_MD, MD_FILE_PATH)
		expect(mockFs.writeFile).toHaveBeenCalledWith(MD_FILE_PATH, PRETTY_MD, expect.any(Function))
		done()
	})
})

describe('compileMarkdown', () => {
	const CWD = 'here'
	const FAKE_COMPONENT_PATH = 'here'
	const COMPONENT_ROOT = 'componets/are/here'
	const FAKE_COMPONENT_FULL_PATH = 'component/is/here'
	const EXTRA_CONTENT = 'extra content documentation'
	let conf: DocgenCLIConfig

	beforeEach(() => {
		conf = extractConfig([], CWD)
		conf.getDocFileName = jest.fn(() => FAKE_COMPONENT_FULL_PATH)
		conf.getDestFile = jest.fn(() => MD_FILE_PATH)
	})

	it('should call getDocFileName to determine the extra docs file bs path', async done => {
		await compileMarkdown(conf, FAKE_COMPONENT_PATH)
		expect(conf.getDocFileName).toHaveBeenCalledWith(path.join(CWD, FAKE_COMPONENT_PATH))
		done()
	})

	it('should call compileTemplates with the right name and config', async done => {
		conf.componentsRoot = COMPONENT_ROOT
		await compileMarkdown(conf, FAKE_COMPONENT_PATH)
		expect(mockCompileTemplates).toHaveBeenCalledWith(
			path.join(COMPONENT_ROOT, FAKE_COMPONENT_PATH),
			conf,
			FAKE_COMPONENT_PATH,
			undefined
		)
		done()
	})

	it('should add extra content if it exists', async done => {
		conf.componentsRoot = COMPONENT_ROOT
		mockFs.readFile.mockImplementation(
			(file: string, opt: any, cb: (e: any, content: string | null) => void) => {
				if (file === FAKE_COMPONENT_FULL_PATH) {
					cb(null, EXTRA_CONTENT)
				}
				cb(null, null)
			}
		)
		await compileMarkdown(conf, FAKE_COMPONENT_PATH)
		expect(mockCompileTemplates).toHaveBeenCalledWith(
			path.join(COMPONENT_ROOT, FAKE_COMPONENT_PATH),
			conf,
			FAKE_COMPONENT_PATH,
			EXTRA_CONTENT
		)
		done()
	})
})