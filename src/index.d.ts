declare module ngHal {

  export interface HalResource {
    /**
     * @param {String} rel
     * @return {Boolean}
     */
    $hasLink(rel: string): boolean;

    /**
     * @param {String} rel
     * @return {Boolean}
     */
    $hasEmbedded(rel: string): boolean;

    /**
     * @param {String} rel
     * @return {Boolean}
     */
    $has(rel: string): boolean;

    /**
     * Get the href of a Link
     *
     * @param {String} rel
     * @param {Object} parameters
     * @return {String}
     */
    $href(rel, parameters);

    /**
     * Get a link
     *
     * !! To get a href, use $href instead !!
     *
     * @param {String} rel
     * @return {Object}
     */
    $link(rel);

    /**
     * Get meta properties
     *
     * !! To get a href, use $href instead !!
     * !! To get a link, use $link instead !!
     * !! To get an embedded resource, use $request().$get(rel) instead !!
     *
     * @param {String} rel
     * @return {Object}
     */
    $meta(name);

    /**
     * Get the Original Response
     *
     * @return {Object)}
     */
    $response();

    /**
     * Get the client to perform requests
     *
     * @return {HalResourceClient)}
     */
    $request();

    /**
     * Execute a HTTP DELETE request on self
     *
     * @param {Object|null} urlParams
     * @param {Object}      options
     * @return {Promise}
     */
    $delete(urlParams, options);

    /**
     * Execute a HTTP PUT request on self
     *
     * @param {Object|null} urlParams
     * @param {Object}      options
     * @return {Promise}
     */
    $put(payload, urlParams, options);

    /**
     * Execute a HTTP GET request on self
     *
     * @param {String}      rel
     * @param {Object|null} urlParams
     * @param {Object}      options
     * @return {Promise}
     */
    $get(urlParams, options);
  }


}

declare module "ngHal" { export = ngHal; }