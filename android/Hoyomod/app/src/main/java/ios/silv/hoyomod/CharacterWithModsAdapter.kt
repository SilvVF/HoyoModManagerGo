package ios.silv.hoyomod

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import coil3.load
import ios.silv.hoyomod.databinding.CharacterWithModsItemBinding
import ios.silv.hoyomod.databinding.ModToggleItemBinding
import ios.silv.hoyomod.net.CharacterWithModsAndTags

class CharacterWithModsAdapter : ListAdapter<CharacterWithModsAndTags, CharacterWithModsAdapter.ViewHolder>(DiffCallback()) {


    class ViewHolder(val binding: CharacterWithModsItemBinding) : RecyclerView.ViewHolder(binding.root)


    class DiffCallback : DiffUtil.ItemCallback<CharacterWithModsAndTags>() {
        override fun areItemsTheSame(oldItem: CharacterWithModsAndTags, newItem: CharacterWithModsAndTags): Boolean {
            return oldItem.character.id == newItem.character.id && oldItem.character.game == newItem.character.game
        }

        override fun areContentsTheSame(oldItem: CharacterWithModsAndTags, newItem: CharacterWithModsAndTags): Boolean {
            return oldItem == newItem
        }
    }


    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = CharacterWithModsItemBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }


    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val cwmt = getItem(position)
        holder.binding.apply {
            characterIcon.load(cwmt.character.avatarUrl)
            characterName.text = cwmt.character.name

            // Clear previous views to avoid duplication
            itemContainer.removeAllViews()

            for ((mod, _) in cwmt.modWithTags) {
                val itemBinding = ModToggleItemBinding.inflate(
                    LayoutInflater.from(itemContainer.context),
                    itemContainer,
                    false
                )
                itemBinding.apply {
                    itemTitle.text = mod.filename
                }

                // Add the inflated item to the container
                itemContainer.addView(itemBinding.root)
            }
        }
    }
}