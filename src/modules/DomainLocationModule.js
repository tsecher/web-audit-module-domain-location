import dns from 'dns';

import {AbstractDomainModule} from 'web_audit/dist/domain/AbstractDomainModule.js';
import {ModuleEvents} from 'web_audit/dist/modules/ModuleInterface.js';

/**
 * Domain Location Module events.
 */
export const DomainLocationModuleEvents = {
	createDomainLocationModule: 'domain_location_module__createDomainLocationModule',
	onResult: 'domain_location_module__onResult',
};

/**
 * Domain Location Validator.
 */
export default class DomainLocationModule extends AbstractDomainModule {

	/**
	 * {@inheritdoc}
	 */
	get name() {
		return 'Domain Location';
	}

	/**
	 * {@inheritdoc}
	 */
	get id() {
		return `domain_location`;
	}

	/**
	 * {@inheritdoc}
	 */
	async init(context) {
		this.context = context;

		// Install store.
		this.context.config.storage?.installStore('domain_location', this.context, {
			url: 'URL',
			ipVersion: 'The IP version (e.g., 4 for IPv4).',
			ipAddress: 'The IP address for which geolocation information is provided.',
			latitude: 'The latitude coordinate of the IP address location.',
			longitude: 'The longitude coordinate of the IP address location.',
			countryName: 'The name of the country where the IP address is located.',
			countryCode: 'The ISO 3166-1 alpha-2 country code of the IP address location.',
			timeZone: 'The time zone offset of the IP address location.',
			zipCode: 'The ZIP code or postal code of the IP address location.',
			cityName: 'The name of the city where the IP address is located.',
			regionName: 'The name of the region or state where the IP address is located.',
			continent: 'The name of the continent where the IP address is located.',
			continentCode: 'The ISO code of the continent where the IP address is located.',
		});

		// Emit.
		this.context.eventBus.emit(DomainLocationModuleEvents.createDomainLocationModule, {module: this});
	}

	/**
	 * {@inheritdoc}
	 */
	async analyseDomain(urlWrapper) {
		try {
			this.context?.eventBus.emit(ModuleEvents.startsComputing, {module: this});

			const result = await this.getBaseResult(urlWrapper.url.hostname);
			result.url = urlWrapper.url.hostname;

			const summary = {
				url: urlWrapper.url.hostname,
				latitude: result.latitude,
				longitude: result.longitude,
				countryName: result.countryName,
				zipCode: result.zipCode,
				cityName: result.cityName,
				regionName: result.regionName,
			};

			this.context?.eventBus.emit(DomainLocationModuleEvents.onResult, {
				module: this,
				url: urlWrapper,
				result: result,
			});
			this.context?.eventBus.emit(ModuleEvents.onAnalyseResult, {module: this, url: urlWrapper, result: result});

			this.context?.config?.logger.result(`Domain Location`, summary, urlWrapper.url.toString());
			// @ts-ignore
			this.context?.config?.storage?.one('domain_location', this.context, result);

			this.context?.eventBus.emit(ModuleEvents.endsComputing, {module: this});

			return true;
		} catch (err) {
			return false;
		}
	}

	/**
	 * Return base result.
	 * @param domain
	 * @returns {Promise<void>}
	 */
	async getBaseResult(domain) {
		const ip = await this.getIpFromDomain(domain);
		const endpoint = `https://freeipapi.com/api/json/${ip}`;
		const response = await fetch(endpoint, {method: 'GET'});
		return response.json();
	}

	/**
	 * {@inheritdoc}
	 */
	finish() {
	}

	/**
	 * Return ip of domain.
	 *
	 * @param {string} domain
	 * @returns {Promise<string>}
	 * @private
	 */
	getIpFromDomain(domain) {
		return new Promise((resolve, reject) => {
			dns.lookup(domain, (err, address, family) => {
				if (err) {
					reject(err);
				}
				resolve(address);
			});
		});
	}

}
