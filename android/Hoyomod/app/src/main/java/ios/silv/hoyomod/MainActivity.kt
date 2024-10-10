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

class MainViewmodel(
    savedStateHandle: SavedStateHandle
): ViewModel() {

    val client = SyncClient(savedStateHandle)
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

        lifecycle.addObserver(mainViewmodel.client)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }
    }

    override fun onStop() {
        super.onStop()
    }

    override fun onDestroy() {
        super.onDestroy()
        lifecycle.removeObserver(mainViewmodel.client)
    }
}