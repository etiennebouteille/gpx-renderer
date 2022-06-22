import "dotenv/config";
import { setTimeout } from "timers/promises";
import axios from "axios";

class PowerManager {
  constructor() {
    this.powered = false;
    this.powerOffScheduled = false;
    this.key = process.env.SCALEWAY_ACCESS_KEY_ID;
    this.instanceID = process.env.SCALEWAY_INSTANCE_ID;
    this.instanceIP = process.env.SCALEWAY_INSTANCE_IP;
  }

  async isPowerOn() {
    const url = `https://api.scaleway.com/instance/v1/zones/fr-par-1/servers/${this.instanceID}`;

    const res = await axios({
      method: "get",
      url: url,
      headers: {
        "X-Auth-Token": this.key,
      },
    });

    console.log("state : ", res.data.server.state);

    if (
      res.data.server.state === "running" ||
      res.data.server.state == "starting"
    ) {
      return true;
    } else {
      return false;
    }
  }

  async poweron() {
    console.log("turning on the render node");
    this.powered = true;

    const url = `https://api.scaleway.com/instance/v1/zones/fr-par-1/servers/${this.instanceID}/action`;

    return await axios({
      method: "post",
      url: url,
      headers: {
        "X-Auth-Token": this.key,
      },
      data: {
        action: "poweron",
      },
    });
  }

  async poweroff() {
    console.log("turning off the render node");
    this.powered = false;
    const halted = await axios.get(`http://${this.instanceIP}/halt`);

    const url = `https://api.scaleway.com/instance/v1/zones/fr-par-1/servers/${this.instanceID}/action`;

    return await axios({
      method: "post",
      url: url,
      headers: {
        "X-Auth-Token": this.key,
      },
      data: {
        action: "poweroff",
      },
    });
  }

  delayedPowerOff(timeoutLength) {
    this.powerOffScheduled = true;
    let shutdownTime = new Date();
    shutdownTime.setMilliseconds(
      shutdownTime.getMilliseconds() + timeoutLength
    );
    this.countdown(shutdownTime);
  }

  cancelPowerOff() {
    this.powerOffScheduled = false;
  }

  //recursive function, it will call itself until poweroff has been canceled, or the time is up. Then it will call the poweroff function
  async countdown(shutdownTime) {
    //check if it has been cancelled
    if (this.powerOffScheduled) {
      const now = new Date();
      if (now < shutdownTime) {
        await setTimeout(100);
        this.countdown(shutdownTime);
      } else {
        const off = await this.poweroff();
      }
    } else {
      //poweroff canceled, do nothing
      console.log("poweroff canceled");
      return;
    }
  }
}

export default PowerManager;
