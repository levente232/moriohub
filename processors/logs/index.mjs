import modules from "./modules/index.mjs"

/*
 * A Morio stream processor to handle log data
 *
 * This is designed to handle data in the 'logs' topic, which
 * typically holds data generated by Filebeat agents,
 * although it can also process other data if it's well-formatted.
 *
 * This method will be called for ever incoming message on the logs topic
 *
 * @param {object} data - The data from RedPanda
 * @param {obectt} tools - The tools object
 * @param {string} topic - The topic the data came from
 */
export default function logsStreamProcessor (data, tools, topic) {
  /*
   * Only handle data that has a log message
   */
  if (data?.message) {
    /*
     * Figure out what cache key to use
     */
    let logset = false
    // Regular logs read from a file
    if (data?.log?.file?.path) logset = data.log.file.path
    // Logs from journald
    if (data?.input?.type === 'journald') {
      const t = 'journald'
      if (data?.container?.name) logset = `${t}.container.${data.container.name}`
      else if (data?.journald?.process?.name) logset = `${t}.process.${data.journald.process.name}`
      else if (data?.syslog?.identifier) logset = `${t}.syslog.${data?.syslog?.identifier}`
      else logset = `${t}.generic`
    }

    /*
     * Only cache what we understand
     */
    if (!logset) return tools.note(`Failed to extract logset from data: ${JSON.stringify(data)}`)

    /*
     * Update the cache
     */
    tools.cache.logline(logset, data.message, data, tools.getSettings('tap.logs', {}))
  }

  /*
   * Hand over to module-specific logic
   */
  if (data?.morio?.module && typeof modules[data.morio.module] === 'function') {
    let logset = false
    let logline = false
    try {
      [logset, logline] = modules[data.morio.module](data, tools)
      if (tools.getSettings('tap.logs.cache', false)) {
        // If the module returned logset and logline, cache
        if (logset && logline) tools.cache.logline(logset, logline, data, tools.getSettings('tap.logs', {}))
        // If not, attempt default cache
        else {
          [logset, logline] = defaultLogCaching(data, tools)
          if (logset && logline) tools.cache.logline(logset, logline, data, tools.getSettings('tap.logs', {}))
          else if (tools.getSettings('tap.logs.log_unhandled', {})) {
            tools.note(`[logs] Cannot handle message (module)`, data)
          }
        }
      }
    }
    catch(err) {
      tools.note(`[event] Error in module logic`, { err, data })
    }
  }
  else {
    const [logset, logline] = defaultLogCaching(data, tools)
    if (logset && logline) tools.cache.logline(logset, logline, data, tools.getSettings('tap.logs', {}))
    else if (tools.getSettings('tap.logs.log_unhandled', {})) {
      tools.note(`[logs] Cannot handle message (default)`, data)
    }
  }
}


function defaultLogCaching (data, tools) {
  return [
    data?.log?.file?.path || false,
    data?.mesage || false
  ]
}

/*
 * This is used for both the UI and to generate the default settings
 */
export const info = {
  title: 'Log stream processor',
  about: `This stream processor will process log data flowing through your Morio collection.

It can cache recent log data, as well as eventify them for event-driven automation.
It also supports dynamic loading of module-specific logic.`,
  settings: {
    enabled: {
      title: 'Enable logs stream processor',
      dflt: true,
      type: 'list',
      list: [
        {
          val: false,
          label: 'Disabled',
          about: 'Select this to completely disabled this stream processor',
        },
        {
          val: true,
          label: 'Enabled',
          about: 'Select this to enable this stream processor',
        },
      ]
    },
    topics: {
      dflt: ['logs'],
      title: 'List of topics to subscribe to',
      about: `Changing this from the default \`logs\` is risky`,
      type: 'labels',
    },
    cache: {
      dflt: true,
      title: 'Cache log data',
      type: 'list',
      list: [
        {
          val: false,
          label: 'Do not cache log data (disable)',
        },
        {
          val: true,
          label: 'Cache recent log data',
          about: 'Caching log data allows consulting it through the dashboards provided by Morio&apos;s UI service'
        },
      ],
    },
    ttl: {
      dflt: 4,
      title: 'Maxumum age of cached logs',
      about: 'Logs in the cache will expire after this amount of time',
      labelBL: 'In hours',
      type: 'number'
    },
    cap: {
      dflt: 25,
      title: 'Maximum number of log lines per logset',
      about: 'This is a hard safety limit regardless of cache age.',
      labelBL: 'In log lines',
      type: 'number'
    },
    eventify: {
      dflt: true,
      title: 'Eventify log data',
      type: 'list',
      list: [
        {
          val: false,
          label: 'Do not eventify log data (disable)',
        },
        {
          val: true,
          label: 'Auto-create events based on log data',
          about: 'Eventifying log data allows for event-driven automation and monitoring based on your logs',
        },
      ],
    },
    log_unhandled: {
      dflt: false,
      title: 'Log unhandled audit data',
      type: 'list',
      list: [
        {
          val: false,
          label: 'Do not log unhandled audit data (disable)',
        },
        {
          val: true,
          label: 'Log unhandled audit data',
          about: 'This allows you to see the kind of audit data that is not being treated by this stream processor. It is intended as a debug tool for stream processor developers and will generate a lot of notes.'
        },
      ],
    },
  }
}
