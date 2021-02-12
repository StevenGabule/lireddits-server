import { UsernamePasswordInput } from "src/resolvers/UsernamePasswordInput"

export const validateRegister = (options: UsernamePasswordInput) => {
  if (options.username.length <= 2) {
    return [{
      field: 'username',
      message: "length must be greater than 2"
    }]
  }

  if (options.password.length <= 2) {
    return [{
      field: 'password',
      message: "length must be greater than 2"
    }]
  }

  if (!options.email.includes('@')) {
    return [{
      field: 'email',
      message: "Invalid email address"
    }]
  }


  if (options.username.includes('@')) {
    return [{
      field: 'username',
      message: "You can't include a @ sign"
    }]
  }

  return null;
}