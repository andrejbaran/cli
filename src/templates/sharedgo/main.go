package main

import (
	"fmt"

	ctoai "github.com/cto-ai/sdk-go"
)

func main() {
	client := ctoai.NewClient()

	howdy := "👋 How are you today?"
	tags := []string{"demo", "track", "go"}
	metadata := map[string]interface{}{"language": "golang"}

	err := client.Sdk.Track(tags, howdy, metadata)
	if err != nil {
		panic(err)
	}

	answer, err := client.Prompt.Input("answer", howdy, ctoai.OptInputAllowEmpty(false))
	if err != nil {
		panic(err)
	}

	response := fmt.Sprintf("👉 Answer: %s", answer)
	err = client.Sdk.Track(tags, response, metadata)
	if err != nil {
		panic(err)
	}

	err = client.Ux.Print(response)
	if err != nil {
		panic(err)
	}
}
