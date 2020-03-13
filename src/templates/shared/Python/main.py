from cto_ai import ux, prompt, sdk

def main():
    howdy = "👋 How are you today?"
    tags = ["demo", "track", "python"]
    metadata = {"language": "python"}

    sdk.track(tags, howdy, metadata)
    answer = prompt.input(name="answer", message=howdy, allowEmpty=False)

    response = f"👉 Answer: {answer}"

    sdk.track(tags, response, metadata)
    ux.print(response)

if __name__ == "__main__":
    main()
