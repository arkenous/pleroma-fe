const registration = {
  data: () => ({
    user: {},
    error: false,
    registering: false
  }),
  methods: {
    submit () {
      this.registering = true
      this.user.nickname = this.user.username
      this.$store.state.api.backendInteractor.register(this.user).then(
        (response) => {
          if (response.ok) {
            this.$store.dispatch('loginUser', this.user)
            this.$router.push('/main/all')
            this.registering = false
          } else {
            this.registering = false
            response.json().then((data) => {
              this.error = data.error
            })
          }
        }
      )
    }
  }
}

export default registration
