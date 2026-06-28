# Third-Party License Policy

This project is distributed under the MIT License.

Third-party packages do not all use MIT, but the current dependency set is
limited to permissive licenses that are compatible with MIT distribution.
Examples in the current lockfile include MIT, ISC, Apache-2.0, BSD-2-Clause,
BSD-3-Clause, 0BSD, BlueOak-1.0.0, Python-2.0, WTFPL, CC0-1.0 and CC-BY-4.0.

Run the automated check before release:

```sh
npm run check:licenses
```

The check fails if a package has missing license metadata or a license outside
the approved permissive set. Dual-licensed packages are accepted only when at
least one option is permissive; for example, `node-forge` can be used under its
BSD-3-Clause option.
