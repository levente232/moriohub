#!/bin/bash
#
# A little helper file that you can source in your scripts
# to get access to the following variables:
#
#   - MORIOHUB_GIT_ROOT
#   - MORIO_ASCII_BANNER
#   - MORIO_GITHUB_REPO
#   - MORIO_GITHUB_REPO_URL
#   - MORIO_WEBSITE
#   - MORIO_WEBSITE_URL
#
# Note: These entries are alphabetic with the exception
#       of MORIO_GIT_ROOT as it is used by some other commands.
#

#
# Location of the git repo on disk
#
MORIO_GIT_ROOT=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && cd .. && pwd )

#
# ASCII Banner
#
read -r -d '' MORIO_ASCII_BANNER << EOB

   _ _ _  ___  _ _  _  ___
  | ' ' |/ . \\| '_/| |/ . \\
  |_|_|_|\\___/|_|  |_|\\___/

EOB

#
# GitHub repository
#
MORIO_GITHUB_REPO="certeu/morio"
MORIO_GITHUB_REPO_URL="https://github.com/certeu/morio"

#
# Website (for documentation)
#
MORIO_WEBSITE="morio.it"
MORIO_WEBSITE_URL="https://morio.it"



