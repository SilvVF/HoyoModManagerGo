package ios.silv.hoyomod

import android.app.Application
import android.content.SharedPreferences
import android.preference.PreferenceManager
import kotlinx.coroutines.runBlocking
import okhttp3.Credentials
import okhttp3.OkHttpClient

class App: Application() {

    override fun onCreate() {
        super.onCreate()
        sharedPreferences = applicationContext.getSharedPreferences(
            PreferenceManager.getDefaultSharedPreferencesName(applicationContext),
            0
        )
    }

    companion object {
        lateinit var sharedPreferences: SharedPreferences

        val client by lazy {
            OkHttpClient.Builder()
                .addInterceptor { chain ->
                    val password = runBlocking {
                        sharedPreferences.get(PrefKeys.PASSWORD, "")
                    }
                    val username = runBlocking {
                        sharedPreferences.get(PrefKeys.USERNAME, "")
                    }

                    val req = chain.request()
                        .newBuilder()
                        .header(
                            "Authorization",
                            Credentials.basic(username, password)
                        ).build()

                    chain.proceed(request = req)
                }
                .build()
        }
    }
}