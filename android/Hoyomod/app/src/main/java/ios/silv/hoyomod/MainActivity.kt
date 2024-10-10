package ios.silv.hoyomod

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import ios.silv.hoyomod.databinding.ActivityMainBinding
import okhttp3.Request

object ServerConstants {
    val FullDataUrl = "https://"
}

class MainViewmodel(
    savedStateHandle: SavedStateHandle
): ViewModel() {

    init {
        App.client.newCall(
            Request.Builder()
                .url("")
                .build()
        )
    }
}

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    private val mainViewmodel by viewModels<MainViewmodel> {
        SavedStateViewModelFactory<MainViewmodel>(SavedStateHandle())
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityMainBinding.inflate(layoutInflater)
        enableEdgeToEdge()
        setContentView(binding.root)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }
    }
}