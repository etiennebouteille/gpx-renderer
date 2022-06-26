import 'dotenv/config'
import { setTimeout } from 'timers/promises'
import axios from 'axios'

class PowerManager {
    constructor() {
        this.powered = false
        this.powerOffScheduled = false
        this.key = process.env.SCALEWAY_ACCESS_KEY_ID
        this.instanceID = process.env.SCALEWAY_INSTANCE_ID
        this.instanceIP = process.env.SCALEWAY_INSTANCE_IP
    }

    async isPowerOn() {
        const url = `https://api.scaleway.com/instance/v1/zones/fr-par-1/servers/${this.instanceID}`

        const res = await axios({
            method: 'get',
            url: url,
            headers: {
                'X-Auth-Token': this.key,
            },
        })

        console.log('state : ', res.data.server.state)

        return res.data.server.state

        // if (
        //   res.data.server.state === "running" ||
        //   res.data.server.state == "starting"
        // ) {
        //   return true;
        // } else {
        //   return false;
        // }
    }

    async poweron() {
        console.log('turning on the render node')

        const status = await this.isPowerOn()

        if (status === 'running' || status === 'starting') {
            return 'Server was asked to start but was already running'
        } else if (status === 'stopped') {
            //server is stopped, we can start it safely
            const url = `https://api.scaleway.com/instance/v1/zones/fr-par-1/servers/${this.instanceID}/action`

            const turnon = await axios({
                method: 'post',
                url: url,
                headers: {
                    'X-Auth-Token': this.key,
                },
                data: {
                    action: 'poweron',
                },
            })
            return turnon.data
        } else if (status === 'stopping') {
            //server is stopping, we need to wait for it to be completely stopped before starting it again
            console.log(
                'Server was asked to start but was stopping, will retry in 10 seconds'
            )
            await setTimeout(10000)
            this.poweron()
        } else {
            console.log(
                'Could not start the server, current server state : ',
                status
            )
        }
    }

    async poweroff() {
        console.log('turning off the render node')
        this.powered = false
        const halted = await axios.get(`http://${this.instanceIP}/halt`)
        console.log('server halting status  : ', halted.data)

        const url = `https://api.scaleway.com/instance/v1/zones/fr-par-1/servers/${this.instanceID}/action`

        return await axios({
            method: 'post',
            url: url,
            headers: {
                'X-Auth-Token': this.key,
            },
            data: {
                action: 'poweroff',
            },
        })
    }

    delayedPowerOff(timeoutLength) {
        this.powerOffScheduled = true
        let shutdownTime = new Date()
        shutdownTime.setMilliseconds(
            shutdownTime.getMilliseconds() + timeoutLength
        )
        this.countdown(shutdownTime)
    }

    cancelPowerOff() {
        this.powerOffScheduled = false
    }

    //recursive function, it will call itself until poweroff has been canceled, or the time is up. Then it will call the poweroff function
    async countdown(shutdownTime) {
        //check if it has been cancelled
        if (this.powerOffScheduled) {
            const now = new Date()
            if (now < shutdownTime) {
                await setTimeout(100)
                this.countdown(shutdownTime)
            } else {
                const off = await this.poweroff()
            }
        } else {
            //poweroff canceled, do nothing
            console.log('poweroff canceled')
            return
        }
    }
}

export default PowerManager
