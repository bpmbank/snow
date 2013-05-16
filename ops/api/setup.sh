# Ubuntu 12.04 ebs (8gb) from http://alestic.com/
# Zone: eu-west-1a
# Security group: justcoin-prod-api
# Ports: 8000 (HTTP)

export environment=production

sudo apt-get update
sudo apt-get upgrade -y

# Node.js
echo | sudo add-apt-repository ppa:chris-lea/node.js
sudo apt-get update
sudo apt-get install -y python-software-properties python g++ make nodejs

# PostgreSQL driver
echo | sudo add-apt-repository ppa:pitti/postgresql
sudo apt-get update
sudo apt-get install -y libpq-dev

cd ~
mkdir snow-api
cd snow-api
mkdir app log repo

# Git
sudo apt-get install -y git

# Repo
cd repo
git init --bare

# Receive hook
tee hooks/post-receive << EOL
#!/bin/sh
cd ~/snow-api
git --work-tree=./app --git-dir=./repo checkout -f
cd app
npm install
sudo stop snow-api
sudo start snow-api
EOL

chmod +x hooks/post-receive

# Upstart
sudo tee /etc/init/snow-api.conf << EOL
setuid ubuntu
env HOME=/home/ubuntu
env name="snow-api"
start on startup
stop on shutdown

script
    cd ~/\$name
    echo \$$ > \$name.pid
    export NODE_ENV=${environment}
    cp config.\$NODE_ENV.json app/
    export DEBUG=snow*
    cd app
    node . >> ../log/\$name.log
end script

pre-stop script
    rm ~/\$name/\$name.pid
end script
EOL

# Monit
sudo apt-get install monit -y

sudo tee /etc/monit/monitrc << EOL
set daemon 120
set logfile syslog
#set alert a@abrkn.com
set mail-format { from: webmaster@staging.justcoin.com }
set mailserver localhost

set httpd port 2812
  allow localhost

include /etc/monit/conf.d/*
EOL

sudo tee /etc/monit/conf.d/snow-api << EOL
check process snow-api
    with pidfile /home/ubuntu/snow-api/snow-api.pid
    start program = "/sbin/start snow-api"
    stop program = "/sbin/stop snow-api"
    if failed port 8000 protocol http
        request /v1/currencies
        with timeout 10 seconds
        then restart
EOL

# Config
tee ~/snow-api/config.${environment}.json << EOL
{
    "pg_read_url": {
        "user": "postgres",
        "host": "TODO",
        "database": "justcoin",
        "ssl": true,
        "password": "postgres"
    },
    "pg_write_url": {
        "user": "postgres",
        "host": "TODO",
        "database": "justcoin",
        "ssl": true,
        "password": "postgres"
    },
    "pg_native": true,
    "port": 8000,
    "ripple_federation": {
        "domain": "justcoin.com",
        "currencies": [
            {
                "currency": "XRP"
            },
            {
                "currency": "BTC",
                "issuer": ""
            }
        ]
    },
    "raven": "",
    "intercom_secret": "",
    "intercom_app_id": "",
    "bde_api_key": "",
    "tropo_voice_token": ""
}
EOL

vim ~/snow-api/config.${environment}.json

sudo reboot

########################################################################
#
# MUST DO FIRST PUSH AT THIS POINT:
# git push ${environment} +${environment}:refs/heads/master
#
# Subsequent pushes can be done with git push ${environment} ${environment}:master
#
########################################################################
