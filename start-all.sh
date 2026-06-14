#!/bin/sh

# Academics server (Python) - port 5004
(cd /app/academics-server && PORT=5004 python3 main.py) &

# Notices-Transport server (Node) - port 5005
(cd /app/notices-transport-server && PORT=5005 npm start) &

# Orchestrator (Node) - port 4000 (this is the exposed port)
cd /app/orchestrator
export PORT=4000
export ACADEMICS_SERVER_URL=http://localhost:5004
export NOTICES_TRANSPORT_SERVER_URL=http://localhost:5005
npm start
