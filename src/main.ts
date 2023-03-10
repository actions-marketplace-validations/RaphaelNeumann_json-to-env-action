import * as core from '@actions/core'

import {camelCase} from 'camel-case'
import {constantCase} from 'constant-case'
import {pascalCase} from 'pascal-case'
import {snakeCase} from 'snake-case'

const convertTypes: Record<string, (s: string) => string> = {
  lower: s => s.toLowerCase(),
  upper: s => s.toUpperCase(),
  camel: camelCase,
  constant: constantCase,
  pascal: pascalCase,
  snake: snakeCase
}

export default async function run(): Promise<void> {
  let excludeList = [
    // this variable is already exported automatically
    'github_token'
  ]

  try {
    const envsJson: string = core.getInput('json_envs', {
      required: true
    })
    const keyPrefix: string = core.getInput('prefix')
    const includeListStr: string = core.getInput('include')
    const excludeListStr: string = core.getInput('exclude')
    const convert: string = core.getInput('convert')
    const convertPrefixStr = core.getInput('convert_prefix')
    const convertPrefix = convertPrefixStr.length
      ? convertPrefixStr === 'true'
      : true

    let env_vars: Record<string, string>
    try {
      env_vars = JSON.parse(envsJson)
    } catch (e) {
      throw new Error(`Cannot parse JSON.
Make sure you pass a valid key:value pairs JSON`)
    }

    let includeList: string[] | null = null
    if (includeListStr.length) {
      includeList = includeListStr.split(',').map(key => key.trim())
    }

    if (excludeListStr.length) {
      excludeList = excludeList.concat(
        excludeListStr.split(',').map(key => key.trim())
      )
    }

    core.debug(`Using include list: ${includeList?.join(', ')}`)
    core.debug(`Using exclude list: ${excludeList.join(', ')}`)

    for (const key of Object.keys(env_vars)) {
      if (includeList && !includeList.some(inc => key.match(new RegExp(inc)))) {
        continue
      }

      if (excludeList.some(inc => key.match(new RegExp(inc)))) {
        continue
      }

      let newKey = keyPrefix.length ? `${keyPrefix}${key}` : key

      if (convert.length) {
        if (!convertTypes[convert]) {
          throw new Error(
            `Unknown convert value "${convert}". Available: ${Object.keys(
              convertTypes
            ).join(', ')}`
          )
        }

        if (!convertPrefix) {
          newKey = `${keyPrefix}${convertTypes[convert](
            newKey.replace(keyPrefix, '')
          )}`
        } else {
          newKey = convertTypes[convert](newKey)
        }
      }

      if (process.env[newKey]) {
        core.warning(`Will re-write "${newKey}" environment variable.`)
      }

      core.exportVariable(newKey, env_vars[key])
      core.info(`Exported secret ${newKey}`)
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

if (require.main === module) {
  run()
}
