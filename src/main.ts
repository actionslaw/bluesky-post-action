import * as core from '@actions/core'
import { Reference, BlueskyAction } from "./BlueskyAction"
import { Valid } from "./Valid"

const service = Valid('service').required(core.getInput)
const identifier = Valid('identifier').required(core.getInput)
const password = Valid('password').required(core.getInput)

core.setSecret(password)

const action = new BlueskyAction(service, identifier, password)

const text = Valid('text').required(core.getInput)
const replyTo = Valid('replyTo').as(core.getInput, Reference.parse)

const reference = action.run(text, replyTo)

core.setOutput('reference', JSON.stringify(reference))
