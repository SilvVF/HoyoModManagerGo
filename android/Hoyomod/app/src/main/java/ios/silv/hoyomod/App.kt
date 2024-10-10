package ios.silv.hoyomod

import android.app.Application
import okhttp3.OkHttpClient

class App: Application() {


    companion object {
        val client by lazy {
            OkHttpClient.Builder()
                .build()
        }
    }
}