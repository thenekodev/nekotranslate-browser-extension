#!/bin/bash

docker run \
    -it \
    -v $(pwd)/src:/app/src \
    --rm \
    chisatoai-browser-addon \
    /bin/bash

