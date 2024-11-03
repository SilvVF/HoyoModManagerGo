package ios.silv.hoyomod.lib

/*
 * Copyright lt 2023
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import kotlin.jvm.JvmInline
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.TweenSpec
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.ScrollableState
import androidx.compose.foundation.gestures.scrollable
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch
import kotlin.math.roundToInt
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.TextUnit
import kotlin.contracts.ExperimentalContracts
import kotlin.contracts.InvocationKind
import kotlin.contracts.contract
import kotlin.math.abs

/*
 * Copyright lt 2023
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * 快捷使用remember { mutableStateOf(T) }
 * Quick use remember { mutableStateOf(T) }
 */
@Composable
inline fun <T> rememberMutableStateOf(
    crossinline initValue: @DisallowComposableCalls () -> T
) = remember { mutableStateOf(initValue()) }

@Composable
inline fun <T> rememberMutableStateOf(
    key1: Any?,
    crossinline initValue: @DisallowComposableCalls () -> T
): MutableState<T> = remember(key1 = key1) { mutableStateOf(initValue()) }

@Composable
inline fun <T> rememberMutableStateOf(
    key1: Any?,
    key2: Any?,
    crossinline initValue: @DisallowComposableCalls () -> T
): MutableState<T> = remember(key1 = key1, key2 = key2) { mutableStateOf(initValue()) }

@Composable
inline fun <T> rememberMutableStateOf(
    key1: Any?,
    key2: Any?,
    key3: Any?,
    crossinline initValue: @DisallowComposableCalls () -> T
): MutableState<T> = remember(key1 = key1, key2 = key2, key3 = key3) { mutableStateOf(initValue()) }

@Composable
fun <T> rememberMutableStateListOf(): SnapshotStateList<T> = remember { SnapshotStateList() }

@Composable
inline fun <T> rememberMutableStateListOf(
    crossinline initValue: @DisallowComposableCalls () -> List<T>
): SnapshotStateList<T> = remember {
    SnapshotStateList<T>().apply {
        addAll(initValue())
    }
}

/**
 * creator: lt  2024/1/3  lt.dygzs@qq.com
 * effect : 稳定的[Flow],在Compose中也是稳定的
 *          Stable [Flow], also stable in Compose
 * warning:
 */
@Stable
class StableFlow<T>(private val flow: Flow<T>) : Flow<T> by flow

/**
 * [remember]一个[StableFlow],在Composable函数中推荐使用此函数
 * [remember] An [StableFlow] is recommended for use in the Composable function
 */
@Composable
inline fun <T> rememberStableFlow(
    crossinline initFlow: @DisallowComposableCalls () -> Flow<T>
): StableFlow<T> = remember { StableFlow(initFlow()) }

fun <T> Flow<T>.toStableFlow(): StableFlow<T> = StableFlow(this)

/**
 * creator: lt  2022/10/23  lt.dygzs@qq.com
 * effect : 适用于Pager的文本指示器
 *          Text indicator for pager
 * warning:
 * @param texts 文本列表
 *              The text list
 * @param offsetPercentWithSelectFlow 选中的指示器的偏移百分比
 *                                     The offset percentage of the selected indicator
 * @param selectIndexFlow 选中的索引
 *                        The index of selected indicator
 * @param fontSize 未被选中的文字大小
 *                  Font size of the text indicator
 * @param selectFontSize 被选中的文字大小
 *                       Font size of the selected text indicator
 * @param textColor 未被选中的文字颜色
 *                  Font color of the text indicator
 * @param selectTextColor 被选中的文字颜色
 *                        Font color of the selected text indicator
 * @param selectIndicatorColor 指示器的颜色
 *                             Color of the indicator
 * @param onIndicatorClick 指示器的点击事件
 *                         Click event of the text indicator
 * @param modifier 修饰
 * @param margin 指示器之间的间距(两边也有,保证即使选中的指示器较大,也不容易超出控件区域)
 *               Spacing between the text indicators
 * @param userCanScroll 用户是否可以滚动
 *                      Whether the user can scroll
 */
@Composable
fun TextPagerIndicator(
    texts: SnapshotStateList<String>,
    offsetPercentWithSelectFlow: StableFlow<Float>,
    selectIndexFlow: StableFlow<Int>,
    fontSize: TextUnit,
    selectFontSize: TextUnit,
    textColor: Color,
    selectTextColor: Color,
    selectIndicatorColor: Color,
    onIndicatorClick: (index: Int) -> Unit,
    modifier: Modifier = Modifier,
    margin: Dp = 8.dp,
    userCanScroll: Boolean = true,
) {
    val density = LocalDensity.current
    val dp20 = remember(density) {
        density.run { 20.dp.toPx() }
    }
    TextPagerIndicator(
        texts = texts,
        offsetPercentWithSelectFlow = offsetPercentWithSelectFlow,
        selectIndexFlow = selectIndexFlow,
        fontSize = fontSize,
        selectFontSize = selectFontSize,
        textColor = textColor,
        selectTextColor = selectTextColor,
        onIndicatorClick = onIndicatorClick,
        selectIndicatorItem = {
            var width by rememberMutableStateOf { 0.dp }
            val offsetPercentWithSelect by offsetPercentWithSelectFlow.collectAsState(0f)
            val selectIndex by selectIndexFlow.collectAsState(0)
            LaunchedEffect(texts, offsetPercentWithSelect, selectIndex) {
                width = density.run {
                    //当前选中的指示器宽度
                    val width =
                        maxOf(dp20, indicatorsInfo.getIndicatorSize(selectIndex) - dp20)
                    if (offsetPercentWithSelect == 0f)
                        return@run width.toDp()
                    val index = selectIndex + if (offsetPercentWithSelect > 0) 1 else -1
                    //将要选中的指示器宽度
                    val toWidth =
                        maxOf(dp20, indicatorsInfo.getIndicatorSize(index) - dp20)
                    //通过百分比计算出实际宽度
                    abs(offsetPercentWithSelect).getPercentageValue(width, toWidth).toDp()
                }
            }
            Box(modifier = Modifier.fillMaxHeight()) {
                Spacer(
                    modifier = Modifier
                        .size(width, 3.dp)
                        .align(Alignment.BottomCenter)
                        .background(selectIndicatorColor, CircleShape)
                )
            }
        },
        modifier = modifier,
        margin = margin,
        userCanScroll = userCanScroll,
    )
}
/**
 * creator: lt  2022/6/27  lt.dygzs@qq.com
 * effect : 工具类或扩展方法
 * warning:
 */

/**
 * 获取居中的值
 */
internal fun midOf(min: Int, number: Int, max: Int): Int = maxOf(min, minOf(number, max))
internal fun midOf(min: Float, number: Float, max: Float): Float = maxOf(min, minOf(number, max))

/**
 * 根据this的百分比(0-1或1-0)来计算start到end对应的值,并返回
 */
internal fun Float/*percentage*/.getPercentageValue(startValue: Float, endValue: Float): Float =
    if (startValue == endValue) startValue
    else (endValue - startValue) * this + startValue

internal fun Float/*percentage*/.getPercentageValue(startValue: Color, endValue: Color): Color =
    Color(
        alpha = getPercentageValue(startValue.alpha, endValue.alpha),
        red = getPercentageValue(startValue.red, endValue.red),
        green = getPercentageValue(startValue.green, endValue.green),
        blue = getPercentageValue(startValue.blue, endValue.blue),
    )

/**
 * 如果[useBlock]为true则返回[block]的返回值,否则返回this
 */
@OptIn(ExperimentalContracts::class)
internal inline fun <T> T.runIf(useBlock: Boolean, block: T.() -> T): T {
    contract {
        callsInPlace(block, InvocationKind.AT_MOST_ONCE)
    }
    return if (useBlock) block(this) else this
}

@OptIn(ExperimentalContracts::class)
internal inline fun <T> T.letIf(useBlock: Boolean, block: (T) -> T): T {
    contract {
        callsInPlace(block, InvocationKind.AT_MOST_ONCE)
    }
    return if (useBlock) block(this) else this
}

//[selectIndicatorItem] 被选中的指示器
@Composable
fun TextPagerIndicator(
    texts: SnapshotStateList<String>,
    offsetPercentWithSelectFlow: StableFlow<Float>,
    selectIndexFlow: StableFlow<Int>,
    fontSize: TextUnit,
    selectFontSize: TextUnit,
    textColor: Color,
    selectTextColor: Color,
    onIndicatorClick: (index: Int) -> Unit,
    selectIndicatorItem: @Composable PagerIndicatorScope.() -> Unit,
    modifier: Modifier = Modifier,
    margin: Dp = 8.dp,
    userCanScroll: Boolean = true,
) {
    val density = LocalDensity.current
    val fontPx by remember(fontSize, density) {
        mutableFloatStateOf(density.run { fontSize.toPx() })
    }
    val selectFontPx by remember(selectFontSize, density) {
        mutableFloatStateOf(density.run { selectFontSize.toPx() })
    }
    PagerIndicator(
        size = texts.size,
        offsetPercentWithSelectFlow = offsetPercentWithSelectFlow,
        selectIndexFlow = selectIndexFlow,
        indicatorItem = { index ->
            val selectIndex by selectIndexFlow.collectAsState(0)
            Box(modifier = Modifier
                .fillMaxHeight()
                .clip(MaterialTheme.shapes.large)
                .clickable {
                    if (index != selectIndex)
                        onIndicatorClick(index)
                }) {
                val offsetPercentWithSelect by offsetPercentWithSelectFlow.collectAsState(0f)
                val (size, color) = remember(
                    index,
                    selectIndex,
                    offsetPercentWithSelect,
                    selectFontSize,
                    fontSize,
                    textColor,
                    selectTextColor,
                ) {
                    val percent = abs(selectIndex + offsetPercentWithSelect - index)
                    if (percent > 1f)
                        return@remember fontSize to textColor
                    density.run {
                        percent.getPercentageValue(selectFontPx, fontPx).roundToInt().toSp()
                    } to percent.getPercentageValue(selectTextColor, textColor)
                }
                Text(
                    text = texts[index],
                    fontSize = size,
                    color = color,
                    modifier = Modifier.align(Alignment.Center),
                )
            }
        },
        selectIndicatorItem = selectIndicatorItem,
        modifier = modifier,
        margin = margin,
        orientation = Orientation.Horizontal,
        userCanScroll = userCanScroll,
    )
}


/**
 * creator: lt  2022/10/25  lt.dygzs@qq.com
 * effect : [PagerIndicator]的compose作用域
 *          Compose scope of the [PagerIndicator]
 * warning:
 */
@Stable
class PagerIndicatorScope(
    /**
     * 指示器列表的信息
     * Info of the indicators
     */
    val indicatorsInfo: IndicatorsInfo,
)

/**
 * creator: lt  2022/6/27  lt.dygzs@qq.com
 * effect : 适用于Pager的指示器
 *          Indicator for pager
 * warning:
 * @param size 指示器数量
 *             Number of indicator
 * @param offsetPercentWithSelectFlow 选中的指示器的偏移百分比
 *                                    The offset percentage of the selected indicator
 * @param selectIndexFlow 选中的索引
 *                        The index of selected indicator
 * @param indicatorItem 未被选中的指示器
 *                      The indicator
 * @param selectIndicatorItem 被选中的指示器
 *                            The selected indicator
 * @param modifier 修饰
 * @param margin 指示器之间的间距(两边也有,保证即使选中的指示器较大,也不容易超出控件区域)
 *               Spacing between indicators
 * @param orientation 指示器排列方向
 *                    Orientation of indicators
 * @param userCanScroll 用户是否可以滚动
 *                      Whether the user can scroll
 */
@Composable
fun PagerIndicator(
    size: Int,
    offsetPercentWithSelectFlow: StableFlow<Float>,
    selectIndexFlow: StableFlow<Int>,
    indicatorItem: @Composable (index: Int) -> Unit,
    selectIndicatorItem: @Composable PagerIndicatorScope.() -> Unit,
    modifier: Modifier = Modifier,
    margin: Dp = 8.dp,
    orientation: Orientation = Orientation.Horizontal,
    userCanScroll: Boolean = false,
) {
    if (size < 1) return
    val density = LocalDensity.current
    //indicatorItem的坐标数据
    val indicatorItemsInfo = remember(size) {
        IndicatorsInfo(IntArray(size * 3))
    }
    val pagerIndicatorScope = remember(size) {
        PagerIndicatorScope(indicatorItemsInfo)
    }
    val coroutineScope = rememberCoroutineScope()
    //用户滑动的偏移
    val offset = remember { Animatable(0f) }
    var minOffset by rememberMutableStateOf { 0f }
    val scrollState = remember(userCanScroll) {
        ScrollableState {
            val oldOffset = offset.value
            val canOffset = midOf(minOffset, it + oldOffset, 0f)
            coroutineScope.launch {
                offset.snapTo(canOffset)
            }
            canOffset - oldOffset
        }
    }
    val offsetPercentWithSelect by offsetPercentWithSelectFlow.collectAsState(0f)
    val selectIndex by selectIndexFlow.collectAsState(0)

    Layout(modifier = modifier.runIf(userCanScroll) {
        scrollable(scrollState, orientation)
    }, content = {
        pagerIndicatorScope.selectIndicatorItem()
        repeat(size) {
            indicatorItem(it)
        }
    }, measurePolicy = { measurableList, constraints ->
        if (measurableList.isEmpty())
            return@Layout layout(0, 0) {}
        val marginPx = density.run { margin.roundToPx() }
        val mConstraints = constraints.copy(minWidth = 0, minHeight = 0)
        val selectPlaceable = measurableList.first().measure(mConstraints)
        var width = 0
        var height = 0
        val isHorizontal = orientation == Orientation.Horizontal
        //测量indicatorItem,并获取其占用的宽高
        val placeableList = (1 until measurableList.size).mapIndexed { index, i ->
            val placeable = measurableList[i].measure(mConstraints)
            if (isHorizontal) {
                if (index == 0) {
                    width = marginPx / 2
                }
                indicatorItemsInfo.setData(i - 1, width, width + placeable.width)
                width += placeable.width + marginPx
                if (index == measurableList.size - 2)
                    width -= marginPx / 2
                height = maxOf(height, placeable.height)
            } else {
                if (index == 0) {
                    height = marginPx / 2
                }
                indicatorItemsInfo.setData(i - 1, height, height + placeable.height)
                width = maxOf(width, placeable.width)
                height += placeable.height + marginPx
                if (index == measurableList.size - 2)
                    height -= marginPx / 2
            }
            placeable
        }
        minOffset = if (isHorizontal) {
            -maxOf(width - constraints.maxWidth, 0).toFloat()
        } else {
            -maxOf(height - constraints.maxHeight, 0).toFloat()
        }
        width = midOf(selectPlaceable.width, width, constraints.maxWidth)
        height = midOf(selectPlaceable.height, height, constraints.maxHeight)
        layout(width, height) {
            val offsetValue = offset.value
            //放置indicatorItem
            var coordinate = 0
            placeableList.forEachIndexed { index, placeable ->
                if (index == 0)
                    coordinate += marginPx / 2
                coordinate += if (isHorizontal) {
                    placeable.placeRelative(
                        coordinate + offsetValue.roundToInt(),
                        (height - placeable.height) / 2
                    )
                    placeable.width + marginPx
                } else {
                    placeable.placeRelative(
                        (width - placeable.width) / 2,
                        coordinate + offsetValue.roundToInt()
                    )
                    placeable.height + marginPx
                }
            }
            //放置selectIndicatorItem
            selectPlaceable.placeRelative(
                x = if (isHorizontal) {
                    //当前索引的中间坐标
                    val currCenter = indicatorItemsInfo.getIndicatorCenter(selectIndex)
                    //是否是往下一页翻
                    val isNext = offsetPercentWithSelect >= 0
                    //起始的x轴
                    val startX = currCenter - selectPlaceable.width / 2
                    //当前索引到下一个索引的差值(偏移量)
                    var difference =
                        indicatorItemsInfo.getIndicatorCenterOrElse(selectIndex + if (isNext) 1 else -1) { currCenter } - currCenter
                    if (!isNext)
                        difference = 0 - difference
                    //计算如果指示器所要移动的位置在界面外,则位移offset
                    if (userCanScroll && !offset.isRunning) {
                        if (offsetPercentWithSelect > 0) {
                            val nextEnd =
                                indicatorItemsInfo.getIndicatorEndOrElse(selectIndex + 1) {
                                    indicatorItemsInfo.getIndicatorEnd(selectIndex)
                                }
                            val end = width - offsetValue - nextEnd
                            if (end < 0) {
                                //靠最右边
                                coroutineScope.launch {
                                    offset.animateTo(offsetValue + end, TweenSpec(150))
                                }
                            } else {
                                val thisStart =
                                    indicatorItemsInfo.getIndicatorStart(selectIndex + 1)
                                val start = width - offsetValue - thisStart
                                if (start > width) {
                                    //靠最左边
                                    coroutineScope.launch {
                                        offset.animateTo(-thisStart.toFloat(), TweenSpec(150))
                                    }
                                }
                            }
                        } else if (offsetPercentWithSelect < 0) {
                            val prevStart =
                                indicatorItemsInfo.getIndicatorStartOrElse(selectIndex - 1) {
                                    indicatorItemsInfo.getIndicatorStart(selectIndex)
                                }
                            val start = -offsetValue - prevStart
                            if (start > 0) {
                                coroutineScope.launch {
                                    offset.animateTo(offsetValue + start, TweenSpec(150))
                                }
                            } else {
                                val thisEnd =
                                    indicatorItemsInfo.getIndicatorEnd(selectIndex - 1)
                                val end = -offsetValue - thisEnd
                                if (end < -width) {
                                    //靠最左边
                                    coroutineScope.launch {
                                        offset.animateTo(width.toFloat() - thisEnd, TweenSpec(150))
                                    }
                                }
                            }
                        }
                    }
                    //计算最终的x轴(起始x轴+偏移的x轴)
                    (startX + difference * offsetPercentWithSelect + offsetValue).roundToInt()
                } else
                    (width - selectPlaceable.width) / 2,
                y = if (isHorizontal)
                    (height - selectPlaceable.height) / 2
                else {
                    //当前索引的中间坐标
                    val currCenter = indicatorItemsInfo.getIndicatorCenter(selectIndex)
                    //是否是往下一页翻
                    val isNext = offsetPercentWithSelect >= 0
                    //起始的y轴
                    val startY = currCenter - selectPlaceable.height / 2
                    //当前索引到下一个索引的差值(偏移量)
                    var difference =
                        indicatorItemsInfo.getIndicatorCenterOrElse(selectIndex + if (isNext) 1 else -1) { currCenter } - currCenter
                    if (!isNext)
                        difference = 0 - difference

                    //计算如果指示器所要移动的位置在界面外,则位移offset
                    if (userCanScroll && !offset.isRunning) {
                        if (offsetPercentWithSelect > 0) {
                            val nextEnd =
                                indicatorItemsInfo.getIndicatorEndOrElse(selectIndex + 1) {
                                    indicatorItemsInfo.getIndicatorEnd(selectIndex)
                                }
                            val end = height - offsetValue - nextEnd
                            if (end < 0) {
                                //靠最右边
                                coroutineScope.launch {
                                    offset.animateTo(offsetValue + end, TweenSpec(150))
                                }
                            } else {
                                val thisStart =
                                    indicatorItemsInfo.getIndicatorStart(selectIndex + 1)
                                val start = height - offsetValue - thisStart
                                if (start > height) {
                                    //靠最左边
                                    coroutineScope.launch {
                                        offset.animateTo(-thisStart.toFloat(), TweenSpec(150))
                                    }
                                }
                            }
                        } else if (offsetPercentWithSelect < 0) {
                            val prevStart =
                                indicatorItemsInfo.getIndicatorStartOrElse(selectIndex - 1) {
                                    indicatorItemsInfo.getIndicatorStart(selectIndex)
                                }
                            val start = -offsetValue - prevStart
                            if (start > 0) {
                                coroutineScope.launch {
                                    offset.animateTo(offsetValue + start, TweenSpec(150))
                                }
                            } else {
                                val thisEnd =
                                    indicatorItemsInfo.getIndicatorEnd(selectIndex - 1)
                                val end = -offsetValue - thisEnd
                                if (end < -height) {
                                    //靠最左边
                                    coroutineScope.launch {
                                        offset.animateTo(height.toFloat() - thisEnd, TweenSpec(150))
                                    }
                                }
                            }
                        }
                    }
                    //计算最终的x轴(起始x轴+偏移的x轴)
                    (startY + difference * offsetPercentWithSelect + offsetValue).roundToInt()
                },
            )
        }
    })
}

/**
 * creator: lt  2022/10/24  lt.dygzs@qq.com
 * effect : 指示器的坐标数据
 *          Location info of the indicators
 * warning: 横向为[start,center,end],竖向为[top,center,bottom]
 */
@JvmInline
value class IndicatorsInfo(val data: IntArray) {
    /**
     * 获取相应[index]位置指示器的start坐标
     * Get start location of the indicators with index
     */
    fun getIndicatorStart(index: Int): Int = getIndicatorStartOrElse(index) { 0 }
    inline fun getIndicatorStartOrElse(index: Int, defaultValue: (Int) -> Int): Int =
        data.getOrElse(index * 3, defaultValue)

    /**
     * 获取相应[index]位置指示器的center坐标
     * Get center location of the indicators with index
     */
    fun getIndicatorCenter(index: Int): Int = getIndicatorCenterOrElse(index) { 0 }
    inline fun getIndicatorCenterOrElse(index: Int, defaultValue: (Int) -> Int): Int =
        data.getOrElse(index * 3 + 1, defaultValue)

    /**
     * 获取相应[index]位置指示器的end坐标
     * Get end location of the indicators with index
     */
    fun getIndicatorEnd(index: Int): Int = getIndicatorEndOrElse(index) { 0 }
    inline fun getIndicatorEndOrElse(index: Int, defaultValue: (Int) -> Int): Int =
        data.getOrElse(index * 3 + 2, defaultValue)

    /**
     * 获取相应[index]位置指示器的宽或高(根据方向)
     * Get size of the indicators with index
     */
    fun getIndicatorSize(index: Int): Int = getIndicatorEnd(index) - getIndicatorStart(index)

    /**
     * 获取相应[index]位置指示器的坐标数据
     * Set location info of index position indicators
     */
    fun setData(index: Int, start: Int, end: Int) {
        if (index >= data.size) return
        data[index * 3] = start
        data[index * 3 + 1] = (start + end) / 2
        data[index * 3 + 2] = end
    }
}