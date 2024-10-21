> [!Warning]
>
> ##### Morio is currently early-access alpha code.
>
> We are building this in the open, so feel free to look around,
> try it out, or [leave feedback](https://github.com/certeu/morio/discussions).
>
> That being said, you probably don't want to run this in production yet.

# Morio Templates

This repository holds a curated collection of templates for
[Morio](https://github/certeu/morio/).

There are two types of templates in this repository:

- Morio client modules, which we refer to as [Modules](#modules)
- Moriod settings overlays, which we refer to as [Overlays](#overlays) or

> [!Note]
> **This is a work in progress. YMMV.**

## Modules

(Morio client) modules provide configuration for the different agents that are
bundled by the Morio client. These agents gather different types of data:

- `audit`: Audit info is collected by [Auditbeat][auditbeat]
- `logs`: Collected by [Filebeat][filebeat]
- `metrics`: Collected by [Metricbeat][metricbeat]

Great observability requires meticulous configuration of each of these agents.
When you have more than a handful of system to configure -- whether it is a
couple dozen, hundreds, or even several thousands -- you will want to apply
some automation.

Maintainability and (facilitating) automation are some of [Morio's design
goals](https://morio.it/docs/guides/goals/), so naturally we want to come up
with a way to take the gruntwork out of this, while still giving you the
flexibility to fin-tune the configuration of your systems.

This repository exists to facilitate that, in serves a double purpose:

- It provides a library of client modules that you can use
- It provides an example of how you can structure your own in-house library
in your own way.

### Rules governing client modules

Below are some rules to ensure each module plays nice within the Morio ecosystem:

- Modules shall have a unique name that is descriptive
- Modules that are platform-specific shall be prefixed by the platform they
  support followed by a dash.. One of `linux-`, `macos-`, or `windows-`.
- Modules that are platform-agnostic shall not have a platform prefix
- Module names shall only use `[a-z][0-9]-`
- Modules can provide one or more of the following files:
  - `audit/module-templates.d/[module-name].yaml`: The configuration for
    Auditbeat
  - `audit/rule-templates.d/[module-name].rule`: A single rule file for auditd
  - `audit/rule-templates.d/[module-name]-*.rule`: If a module utilzes multiple
    rule files, prefix them with the module name and a dash
  - `logs/module-templates.d/[module-name].yaml`: The module configuration for
    Filebeat. Create an empty placeholder file if your module only provide
    inputs.
  - `logs/input-templates.d/[module-name].yaml`: The input configuration for
    Filebeat
  - `metrics/module-templates.d/[module-name].yaml`: The configuration for
    Metricbeat

### Module file templates

Each of the various beats agents takes a YAML file as configuration.

> The `rules` files used by Audutbeat are an exception, and this section does
> not apply to them.

To balance the ease-of-use of having a library of templates you can re-use with
the requirement to be able to adapt the configuration to your specific needs,
this repository does not host YAML files but rather templates that can be
converted to YAML files by the Morio client (or by any script utilizing the
[Mustache templating library](https://mustache.github.io/).

In addition, the documentation for each template is included in the module file itself. Let's look at an example of a module file structure:

```yaml
# This: {{ EXAMPLE }}
# is a mustache tag.
# The Morio client will replace it with whatever is stored in the EXAMPLE variable.
#
# The # prefix indicates that this block will only be rendered
# when the variable following it is set.
# So this: {{#MORIO_DOCS}}
# Means that whatever follows will only be rendered when MORIO_DOCS is set.
# To close such a block, use: {{/MORIO_DOCS}}
{{#MORIO_DOCS}}
# We are not inside a block that will only rendered when MORIO_DOCS is set.
# We use this to extract the documentation info which is included in this block.
# Your module files should follow this same structure.
#
# The 'about' key holds a description of the module. Multi-line is ok.
about: |-
  A metricbeat module for Linux system

  This leverages the `system` metricbeat module to gather basic data from a
  Linux system.
# The 'vars' key holds information about the vars used in this module.
vars:
  # The 'vars.local' key holds an object/map with name/description pairs
  # for the vars that are specific to this file.
  local:
    LINUX_SYSTEM_FILESYSTEM_INTERVAL: The interval to use for filesystem data
    LINUX_SYSTEM_INVENTORY_INTERVAL: The interval to use for inventory data
    LINUX_SYSTEM_METRICSETS: The metricsets to collect on every tick
    LINUX_SYSTEM_MOUNTPOINTS_IGNORE_REGEX: A regular expression of mountpoints for which to drop events
  # The 'vars.global' key holds an array/slice of names of global Morio vars
  # that are used by the module.
  global:
    - MORIO_TICK
  # The 'vars.defaults' key holds on object/map with the name/values that should
  # be set as default values for the module. This should only include local vars
  # as the defaults of the global vars cannot be changed by a module.
  # Note: This is not mere documentation. This will be used by the Morio client
  # to set the defaults for these vars
  defaults:
    LINUX_SYSTEM_FILESYSTEM_INTERVAL: 10m
    LINUX_SYSTEM_INVENTORY_INTERVAL: 8h
    # Vars will typically hold a string, but it can also be an array:
    LINUX_SYSTEM_METRICSETS_ALWAYS:
      - cpu
      - diskio
      - load
      - memory
      - network
      - service
    # Make sure to quote your strings if there's a risk they will cause issues when parsing YAML
    LINUX_SYSTEM_MOUNTPOINTS_IGNORE_REGEX: '^/(snap|sys|cgroup|proc|dev|etc|host|lib)($|/)'
{{/MORIO_DOCS}}
#
# Just like the # prefix indicates that this block will only be rendered
# when the variable following it is set, the ^ prefix does the opposite:
# Only render this block when the variable following it is NOT set.
# so this: {{^MORIO_DOCS}}
# Means that whatever follows will only be rendered when MORIO_DOCS is NOT set.
# When the Morio client templates out the configuration, MORIO_DOCS will not
# be set, and thus the entire block above will be ignored, and this is where the
# actual configuration starts.
{{^MORIO_DOCS}}
- module: system
  # This is a global variable that controls the minimal time interval
  # between subsequent collections of data.
  period: {{ MORIO_TICK }}
  # And this is a local variable that controls what metricsets should
  # be collects.
  # Using module variables like this allows people to use this template as-is
  # without losing the ability to fine-tune the configuration.
  metricsets: {{ LINUX_SYSTEM_METRICSETS_ALWAYS }}
  service.state_filter: [ failed ]
  processors:
    - add_fields:
        target: morio
        fields:
          # This variable will be set by the Morio client when templating out
          # the configuration. It is a best practice to use this and avoid
          # hard-coding the module name.
          module: {{ MORIO_MODULE_NAME }}
#
# Here, this entire block is made conditional.
# It will only be included when MORIO_TRACK_INVENTORY is set.
{{#MORIO_TRACK_INVENTORY}}
- module: system
  # This uses a non-standard (slower) interval for which the module created a local var.
  period: {{ LINUX_SYSTEM_INVENTORY_INTERVAL }}
  metricsets:
    - load
    - memory
  processors:
    - add_host_metadata:
        netinfo.enabled: true
        cache.ttl: 60m
    - add_fields:
        target: morio
        fields:
          module: {{ MORIO_MODULE_NAME }}
          inventory_update: true
{{/MORIO_TRACK_INVENTORY}}
{{/MORIO_DOCS}}
# Do not forget to close your conditional blocks.
```

## Overlays

The overlays are stored in the `overlays` folder.

Refer to [the documentation on
overlays](https://morio.it/docs/guides/settings/preseed/#understanding-overlays)
for all details.


[auditbeat]: https://www.elastic.co/guide/en/beats/auditbeat/master/index.html
[filebeat]: https://www.elastic.co/guide/en/beats/filebeat/master/index.html
[metricbeat]: https://www.elastic.co/guide/en/beats/metricbeat/master/index.html
