#!/bin/bash

howdy="👋 How are you today?"
tags="demo track shell"
metadata="language:bash"

sdk track "$howdy" $tags $metadata
answer=$(ux prompt input \
   --message "$howdy" \
   --name "answer")

response="👉 Answer: $answer"
sdk track "$response" $tags $metadata
ux print "$response"
