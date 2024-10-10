package ios.silv.hoyomod

import java.net.NetworkInterface

object NetUtils {

    fun getIpv4Addr(): Result<String> = runCatching {
        val interfaces = NetworkInterface.getNetworkInterfaces()
        for (intf in interfaces.iterator()) {
            for (addr in intf.inetAddresses) {

                if (addr.isLoopbackAddress) continue
                val host = addr.hostAddress ?: continue

                val ipv4 = host.indexOf(':') < 0
                if (ipv4) {
                    return@runCatching host
                }
            }
        }
        error("unable to get host address")
    }
}