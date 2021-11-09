const { getDuration, concatLabels, applyViaStream } = require('../common')

/**
 *
 * @param valueExpr {string}
 * @param token {Token}
 * @param query {registry_types.Request}
 * @returns {registry_types.Request}
 */
const genericRate = (valueExpr, token, query) => {
  const duration = getDuration(token, query)
  const step = query.ctx.step
  /**
     *
     * @type {registry_types.Request}
     */
  /* const queryGaps = {
        select: [
            'a1.labels',
            `toFloat64(${Math.floor(query.ctx.start / duration) * duration} + number * ${duration}) as timestamp_ms`,
            'toFloat64(0) as value'
        ],
        from: `(SELECT DISTINCT labels FROM rate_a) as a1, numbers(${Math.floor((query.ctx.end - query.ctx.start) / duration)}) as a2`,
    }; */
  return {
    ctx: { ...query.ctx, duration: duration },
    with: {
      ...(query.with || {}),
      rate_a: {
        ...query,
        ctx: undefined,
        with: undefined,
        limit: undefined,
        stream: undefined
      },
      rate_b: {
        select: [
          concatLabels(query) + ' as labels',
                    `floor(timestamp_ms / ${duration}) * ${duration} as timestamp_ms`,
                    `${valueExpr} as value`
        ],
        from: 'rate_a',
        group_by: ['labels', 'timestamp_ms'],
        order_by: {
          name: ['labels', 'timestamp_ms'],
          order: 'asc'
        }
      },
      rate_c: step > duration
        ? {
            select: [
              'labels',
                    `floor(timestamp_ms / ${step}) * ${step} as timestamp_ms`,
                    'argMin(rate_b.value, rate_b.timestamp_ms) as value'
            ],
            from: 'rate_b',
            group_by: ['labels', 'timestamp_ms'],
            order_by: {
              name: ['labels', 'timestamp_ms'],
              order: 'asc'
            }
          }
        : undefined
    },
    select: ['labels', 'timestamp_ms', 'sum(value) as value'],
    from: step > duration ? 'rate_c' : 'rate_b',
    group_by: ['labels', 'timestamp_ms'],
    order_by: {
      name: ['labels', 'timestamp_ms'],
      order: 'asc'
    },
    matrix: true,
    stream: query.stream
  }
}

module.exports.genericRate = genericRate

/**
 *
 * @param token {Token}
 * @param query {registry_types.Request}
 * @returns {registry_types.Request}
 */
module.exports.rateStream = (token, query) => {
  const duration = getDuration(token, query)
  return applyViaStream(token, query, (sum) => {
    sum = sum || 0
    ++sum
    return sum
  }, (sum) => sum * 1000 / duration, false)
}

/**
 *
 * @param token {Token}
 * @param query {registry_types.Request}
 * @returns {registry_types.Request}
 */
module.exports.countOverTimeStream = (token, query) => {
  return applyViaStream(token, query, (sum) => {
    sum = sum || 0
    ++sum
    return sum
  }, (sum) => sum, false)
}

/**
 *
 * @param token {Token}
 * @param query {registry_types.Request}
 * @returns {registry_types.Request}
 */
module.exports.bytesRateStream = (token, query) => {
  const duration = getDuration(token, query)
  return applyViaStream(token, query, (sum, entry) => {
    sum = sum || 0
    sum += entry.string.length
    return sum
  }, (sum) => sum * 1000 / duration, false)
}

/**
 *
 * @param token {Token}
 * @param query {registry_types.Request}
 * @returns {registry_types.Request}
 */
module.exports.bytesOverTimeStream = (token, query) => {
  return applyViaStream(token, query, (sum, entry) => {
    sum = sum || 0
    sum += entry.string.length
    return sum
  }, (sum) => sum, false)
}

/**
 *
 * @param token {Token}
 * @param query {registry_types.Request}
 * @returns {registry_types.Request}
 */
module.exports.bytesOverTimeStream = (token, query) => {
  throw new Error('Not Implemented')
}
