FROM registry.cto.ai/official_images/python:latest

WORKDIR /ops

ADD requirements.txt .

RUN pip3 install -r requirements.txt

ADD . .
