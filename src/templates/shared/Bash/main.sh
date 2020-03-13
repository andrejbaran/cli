#!/bin/bash

howdy="👋 How are you today?"
tags="demo track go"
metadata="language:golang"

ctoai track "$howdy" $tags $metadata
answer=$(ctoai prompt input \
   --message "$howdy" \
   --name "answer")

response="👉 Answer: $answer"
ctoai track "$response" $tags $metadata
ctoai print "$response"
