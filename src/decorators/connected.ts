import { errors } from '@/data/errors.js'

export function connected(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value

  descriptor.value = function (...args: any[]) {
    if (!this.isConnected()) {
      throw new Error(errors.NOT_CONNECTED)
    }

    return originalMethod.apply(this, args)
  }

  return descriptor
}
