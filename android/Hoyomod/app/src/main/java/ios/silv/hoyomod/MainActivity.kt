package ios.silv.hoyomod

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.SearchView.OnQueryTextListener
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.tabs.TabLayout
import com.google.android.material.tabs.TabLayout.Tab
import ios.silv.hoyomod.databinding.ActivityMainBinding
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch


class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    private val mainViewmodel by viewModels<MainViewModel> {
        SavedStateViewModelFactory<MainViewModel>(SavedStateHandle())
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityMainBinding.inflate(layoutInflater)
        enableEdgeToEdge()
        setContentView(binding.root)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, 0, systemBars.right, systemBars.bottom)
            binding.appbar.setPadding(0, systemBars.top, 0, 0)
            insets
        }

        binding.searchView.setOnQueryTextListener(object : OnQueryTextListener {
            override fun onQueryTextChange(newText: String?): Boolean {
                mainViewmodel.search(newText.orEmpty())
                return true
            }
            override fun onQueryTextSubmit(query: String?): Boolean = true
        })

        binding.recyclerView.layoutManager = LinearLayoutManager(this)

        val adapter = CharacterWithModsAdapter()
        binding.recyclerView.adapter = adapter

        setupTabs(binding.tabLayout, mainViewmodel)

        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                mainViewmodel.state.collect { state ->
                    when(state) {
                        is MainViewModel.State.Failure -> {}
                        MainViewModel.State.Loading -> {}
                        is MainViewModel.State.Success -> {
                            adapter.submitList(state.data)
                        }
                    }
                }
            }
        }
    }

    private fun setupTabs(
        tabLayout: TabLayout,
        mainViewModel: MainViewModel,
    ) {
        val tabs = arrayOf(
            tabLayout.newTab().setText("Genshin"),
            tabLayout.newTab().setText("Star Rail"),
            tabLayout.newTab().setText("ZZZ"),
            tabLayout.newTab().setText("WuWa")
        )
        tabs.forEachIndexed { i, tab ->
            tabLayout.addTab(tab, i == mainViewModel.tabIdx.value)
        }
        binding.tabLayout.addOnTabSelectedListener(object: TabLayout.OnTabSelectedListener{
            override fun onTabSelected(tab: Tab?) {
                mainViewmodel.updateCurrentTab( tab?.position ?: 0)
            }
            override fun onTabUnselected(tab: Tab?) = Unit
            override fun onTabReselected(tab: Tab?) = Unit
        })
    }
}