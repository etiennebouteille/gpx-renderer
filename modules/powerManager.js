import "dotenv/config";
import { setTimeout } from "timers/promises";
import axios from "axios";

class PowerManager {
  constructor() {
    this.powered = false;
    this.powerOffScheduled = false;
  }

  isPowerOn() {
    return this.powered;
  }

  async poweron() {
    console.log("turning on the render node");
    this.powered = true;

    const key = process.env.SCALEWAY_ACCESS_KEY_ID;
    const instanceID = process.env.SCALEWAY_INSTANCE_ID;

    //TODO varaible env!!
    const url = `https://api.scaleway.com/instance/v1/zones/fr-par-1/servers/${instanceID}/action`;

    return await axios({
      method: "post",
      url: url,
      headers: {
        "X-Auth-Token": key,
      },
      data: {
        action: "poweron",
      },
    });
  }

  async poweroff() {
    console.log("turning off the render node");
    this.powered = false;
    const instanceIP = process.env.SCALEWAY_INSTANCE_IP;
    const halted = await axios.get(`http://${instanceIP}/halt`);

    const key = process.env.SCALEWAY_ACCESS_KEY_ID;
    const instanceID = process.env.SCALEWAY_INSTANCE_ID;

    const url = `https://api.scaleway.com/instance/v1/zones/fr-par-1/servers/${instanceID}/action`;

    return await axios({
      method: "post",
      url: url,
      headers: {
        "X-Auth-Token": key,
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
