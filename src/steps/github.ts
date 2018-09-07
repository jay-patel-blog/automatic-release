import * as path from 'path';

import * as githubReleaser from 'conventional-github-releaser';
import * as githubRemoveAllReleases from 'github-remove-all-releases';

import { changelogTransformer, changelogCommitGroupsSort } from './../templates/changelog-transform';
import { log } from './../log';
import { readFile } from '../utilities/read-file';

/**
 * Create all GitHub releases
 *
 * @param   repositoryOwner - Repository owner
 * @param   repositoyName   - Repository name
 * @param   repositoryUrl   - Repository URL
 * @param   githubToken     - GitHub token
 * @returns                 - Promise
 */
export async function createAllGithubReleases( repositoryOwner: string, repositoyName: string, repositoryUrl: string, githubToken: string ):
	Promise<void> {

	log( 'substep', 'Delete all existing GitHub releases' );
	await deleteAllGithubReleases( repositoryOwner, repositoyName, githubToken );

	log( 'substep', 'Create all GitHub releases' );
	await createGithubReleases( repositoryUrl, githubToken );

}

/**
 * Create all GitHub releases
 *
 * @param   repositoryUrl      - Repository URL
 * @param   githubToken        - GitHub token
 * @returns                    - Promise
 */
function createGithubReleases( repositoryUrl: string, githubToken: string ): Promise<void> {
	return new Promise<void>( async( resolve: () => void, reject: ( error: Error ) => void ) => {

		// Create a new release on GitHub
		githubReleaser( {
			type: 'oauth',
			token: githubToken
		}, {
			pkg: {
				path: path.resolve( process.cwd(), 'package.json' )
			},
			preset: 'angular',
			releaseCount: 0 // Regenerate the whole thing every time
		}, {
			linkCompare: false // We use a custom link
		}, {}, {}, {
			commitGroupsSort: changelogCommitGroupsSort,
			commitPartial: await readTemplate( 'commit' ),
			footerPartial: await readTemplate( 'footer' ),
			headerPartial: '', // No header for release notes
			mainTemplate: await readTemplate( 'main' ),
			transform: changelogTransformer( repositoryUrl ) // Custom transform (shows all commit types)
		}, ( error: Error | null, response: any ) => { // We do not care about the response

			// Catch library errors
			if ( error ) {
				reject( new Error( `An error occured while creating GitHub releases. [${ error.message }]` ) );
				return;
			}

			resolve();

		} );

	} );

}

/**
 * Delete all GitHub releases
 *
 * @param   owner       - Repository owner
 * @param   name        - Repository name
 * @param   githubToken - GitHub token
 * @returns             - Promise
 */
function deleteAllGithubReleases( owner: string, name: string, githubToken: string ): Promise<void> {
	return new Promise<void>( ( resolve: () => void, reject: ( error: Error ) => void ) => {

		// Clean all releases on GitHub
		githubRemoveAllReleases( {
			type: 'oauth',
			token: githubToken
		}, owner, name, ( error: Error | null, response: any ) => { // We do not care about the response

			// Catch library errors (except missing releases)
			if ( error && error.toString() !== 'Error: No releases found' ) {
				reject( new Error( `An error occured while deleting GitHub releases. [${ error.message }]` ) );
				return;
			}

			resolve();

		} );

	} );
}

async function readTemplate( templateName: string ): Promise<string> {
	return readFile( `./../templates/changelog-${ templateName }.hbs`, true );
}
