import Completion from '../../services/completion/completion.js'
import EmojiPicker from '../emoji_picker/emoji_picker.vue'
import { take } from 'lodash'

/**
 * EmojiInput - augmented inputs for emoji and autocomplete support in inputs
 * without having to give up the comfort of <input/> and <textarea/> elements
 *
 * Intended usage is:
 * <EmojiInput v-model="something">
 *   <input v-model="something"/>
 * </EmojiInput>
 *
 * Works only with <input> and <textarea>. Intended to use with only one nested
 * input. It will find first input or textarea and work with that, multiple
 * nested children not tested. You HAVE TO duplicate v-model for both
 * <emoji-input> and <input>/<textarea> otherwise it will not work.
 *
 * Be prepared for CSS troubles though because it still wraps component in a div
 * while TRYING to make it look like nothing happened, but it could break stuff.
 */

const EmojiInput = {
  props: {
    suggest: {
      /**
       * suggest: function (input: String) => Suggestion[]
       *
       * Function that takes input string which takes string (textAtCaret)
       * and returns an array of Suggestions
       *
       * Suggestion is an object containing following properties:
       * displayText: string. Main display text, what actual suggestion
       *    represents (user's screen name/emoji shortcode)
       * replacement: string. Text that should replace the textAtCaret
       * detailText: string, optional. Subtitle text, providing additional info
       *    if present (user's nickname)
       * imageUrl: string, optional. Image to display alongside with suggestion,
       *    currently if no image is provided, replacement will be used (for
       *    unicode emojis)
       *
       * TODO: make it asynchronous when adding proper server-provided user
       * suggestions
       *
       * For commonly used suggestors (emoji, users, both) use suggestor.js
       */
      required: true,
      type: Function
    },
    value: {
      /**
       * Used for v-model
       */
      required: true,
      type: String
    },
    emojiPicker: {
      required: false,
      type: Boolean,
      default: false
    },
    emojiPickerExternalTrigger: {
      required: false,
      type: Boolean,
      default: false
    },
    stickerPicker: {
      required: false,
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      input: undefined,
      highlighted: 0,
      caret: 0,
      focused: false,
      blurTimeout: null,
      showPicker: false,
      temporarilyHideSuggestions: false,
      spamMode: false,
      disableClickOutside: false
    }
  },
  components: {
    EmojiPicker
  },
  computed: {
    suggestions () {
      const firstchar = this.textAtCaret.charAt(0)
      if (this.textAtCaret === firstchar) { return [] }
      const matchedSuggestions = this.suggest(this.textAtCaret)
      if (matchedSuggestions.length <= 0) {
        return []
      }
      return take(matchedSuggestions, 5)
        .map(({ imageUrl, ...rest }, index) => ({
          ...rest,
          // eslint-disable-next-line camelcase
          img: imageUrl || '',
          highlighted: index === this.highlighted
        }))
    },
    showSuggestions () {
      return this.focused &&
        this.suggestions &&
        this.suggestions.length > 0 &&
        !this.showPicker &&
        !this.temporarilyHideSuggestions
    },
    textAtCaret () {
      return (this.wordAtCaret || {}).word || ''
    },
    wordAtCaret () {
      if (this.value && this.caret) {
        const word = Completion.wordAtPosition(this.value, this.caret - 1) || {}
        return word
      }
    }
  },
  mounted () {
    const slots = this.$slots.default
    if (!slots || slots.length === 0) return
    const input = slots.find(slot => ['input', 'textarea'].includes(slot.tag))
    if (!input) return
    this.input = input
    this.resize()
    input.elm.addEventListener('blur', this.onBlur)
    input.elm.addEventListener('focus', this.onFocus)
    input.elm.addEventListener('paste', this.onPaste)
    input.elm.addEventListener('keyup', this.onKeyUp)
    input.elm.addEventListener('keydown', this.onKeyDown)
    input.elm.addEventListener('transitionend', this.onTransition)
    input.elm.addEventListener('compositionupdate', this.onCompositionUpdate)
  },
  unmounted () {
    const { input } = this
    if (input) {
      input.elm.removeEventListener('blur', this.onBlur)
      input.elm.removeEventListener('focus', this.onFocus)
      input.elm.removeEventListener('paste', this.onPaste)
      input.elm.removeEventListener('keyup', this.onKeyUp)
      input.elm.removeEventListener('keydown', this.onKeyDown)
      input.elm.removeEventListener('transitionend', this.onTransition)
      input.elm.removeEventListener('compositionupdate', this.onCompositionUpdate)
    }
  },
  methods: {
    triggerShowPicker () {
      this.showPicker = true
      // This temporarily disables "click outside" handler
      // since external trigger also means click originates
      // from outside, thus preventing picker from opening
      this.disableClickOutside = true
      setTimeout(() => {
        this.disableClickOutside = false
      }, 0)
    },
    togglePicker () {
      this.input.elm.focus()
      this.showPicker = !this.showPicker
    },
    replace (replacement) {
      const newValue = Completion.replaceWord(this.value, this.wordAtCaret, replacement)
      this.$emit('input', newValue)
      this.caret = 0
    },
    insert ({ insertion, spamMode }) {
      const newValue = [
        this.value.substring(0, this.caret),
        insertion,
        this.value.substring(this.caret)
      ].join('')
      this.spamMode = spamMode
      this.$emit('input', newValue)
      const position = this.caret + insertion.length

      this.$nextTick(function () {
        // Re-focus inputbox after clicking suggestion
        this.input.elm.focus()
        // Set selection right after the replacement instead of the very end
        this.input.elm.setSelectionRange(position, position)
        this.caret = position
      })
    },
    replaceText (e, suggestion) {
      const len = this.suggestions.length || 0
      if (this.textAtCaret.length === 1) { return }
      if (len > 0 || suggestion) {
        const chosenSuggestion = suggestion || this.suggestions[this.highlighted]
        const replacement = chosenSuggestion.replacement
        const newValue = Completion.replaceWord(this.value, this.wordAtCaret, replacement)
        this.$emit('input', newValue)
        this.highlighted = 0
        const position = this.wordAtCaret.start + replacement.length

        this.$nextTick(function () {
          // Re-focus inputbox after clicking suggestion
          this.input.elm.focus()
          // Set selection right after the replacement instead of the very end
          this.input.elm.setSelectionRange(position, position)
          this.caret = position
        })
        e.preventDefault()
      }
    },
    cycleBackward (e) {
      const len = this.suggestions.length || 0
      if (len > 1) {
        this.highlighted -= 1
        if (this.highlighted < 0) {
          this.highlighted = this.suggestions.length - 1
        }
        e.preventDefault()
      } else {
        this.highlighted = 0
      }
    },
    cycleForward (e) {
      const len = this.suggestions.length || 0
      if (len > 1) {
        this.highlighted += 1
        if (this.highlighted >= len) {
          this.highlighted = 0
        }
        e.preventDefault()
      } else {
        this.highlighted = 0
      }
    },
    onTransition (e) {
      this.resize()
    },
    onBlur (e) {
      // Clicking on any suggestion removes focus from autocomplete,
      // preventing click handler ever executing.
      this.blurTimeout = setTimeout(() => {
        this.focused = false
        this.setCaret(e)
        this.resize()
      }, 200)
    },
    onClick (e, suggestion) {
      this.replaceText(e, suggestion)
    },
    onFocus (e) {
      if (this.blurTimeout) {
        clearTimeout(this.blurTimeout)
        this.blurTimeout = null
      }

      if (!this.spamMode) {
        this.showPicker = false
      }
      this.focused = true
      this.setCaret(e)
      this.resize()
      this.temporarilyHideSuggestions = false
    },
    onKeyUp (e) {
      const { key } = e
      this.setCaret(e)
      this.resize()

      // Setting hider in keyUp to prevent suggestions from blinking
      // when moving away from suggested spot
      if (key === 'Escape') {
        this.temporarilyHideSuggestions = true
      } else {
        this.temporarilyHideSuggestions = false
      }
    },
    onPaste (e) {
      this.setCaret(e)
      this.resize()
    },
    onKeyDown (e) {
      const { ctrlKey, shiftKey, key } = e
      // Disable suggestions hotkeys if suggestions are hidden
      if (!this.temporarilyHideSuggestions) {
        if (key === 'Tab') {
          if (shiftKey) {
            this.cycleBackward(e)
          } else {
            this.cycleForward(e)
          }
        }
        if (key === 'ArrowUp') {
          this.cycleBackward(e)
        } else if (key === 'ArrowDown') {
          this.cycleForward(e)
        }
        if (key === 'Enter') {
          if (!ctrlKey) {
            this.replaceText(e)
          }
        }
      }
      // Probably add optional keyboard controls for emoji picker?

      // Escape hides suggestions, if suggestions are hidden it
      // de-focuses the element (i.e. default browser behavior)
      if (key === 'Escape') {
        if (!this.temporarilyHideSuggestions) {
          this.input.elm.focus()
        }
      }

      this.showPicker = false
      this.resize()
    },
    onInput (e) {
      this.showPicker = false
      this.setCaret(e)
      this.resize()
      this.$emit('input', e.target.value)
    },
    onCompositionUpdate (e) {
      this.showPicker = false
      this.setCaret(e)
      this.resize()
      this.$emit('input', e.target.value)
    },
    onClickOutside (e) {
      if (this.disableClickOutside) return
      this.showPicker = false
    },
    onStickerUploaded (e) {
      this.showPicker = false
      this.$emit('sticker-uploaded', e)
    },
    onStickerUploadFailed (e) {
      this.showPicker = false
      this.$emit('sticker-upload-Failed', e)
    },
    setCaret ({ target: { selectionStart } }) {
      this.caret = selectionStart
    },
    resize () {
      const { panel } = this.$refs
      if (!panel) return
      const { offsetHeight, offsetTop } = this.input.elm
      this.$refs.panel.style.top = (offsetTop + offsetHeight) + 'px'
      this.$refs.picker.$el.style.top = (offsetTop + offsetHeight) + 'px'
    }
  }
}

export default EmojiInput
