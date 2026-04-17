# A website skeleton with Dockerfile and docker-compose.yml for running a website inside a docker container.


## To create a new repository out of here:



## 1. Clone the project

`git clone <url-of-origin-repo>`

`cd <project-folder>`

## 2. Remove the existing remote connection

To avoid accidentally pushing changes to the original project, you need to remove the origin remote.

`git remote remove origin`

## 3. Create a new repository on GitHub
Go to GitHub and create a new, empty repository.
Copy the URL of the new repository (HTTPS or SSH).

## 4. Make changes
Edit the files in the local folder as you wish.

## 5. Link and push to the new repository
Connect the local directory to the new repository and upload the changes:

Optional: If you want to rename the branch (e.g. from master to main):

`git branch -M main`

Add the new remote:

`git remote add origin <url-of-new-repo>`

Stage and commit changes:

`git add .`


`git commit -m "First commit in the new repository"`



Push changes:

`git push -u origin main`


# To start and run docker container:

`docker compose up --build -d 2>&1`
