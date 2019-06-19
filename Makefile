###
# Author: Brett Campbell (brett@hackcapital.com)
# Date: Wednesday, 27th March 2019 5:27:12 pm
#
# Usage:
# make (command)
#
###


ifneq (,)
	This makefile requires GNU Make.
endif

# Variables
APP:=ops


test:
	npm run test

testOutput:
	TEST_OUTPUT=1 npm run test

prepack:
	npm run prepack

install:
	npm install

.PHONY: install prepack test

pretty:
	npm run pretty
