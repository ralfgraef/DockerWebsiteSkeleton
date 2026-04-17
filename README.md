# A website skeleton with Dockerfile and docker-compose.yml for running a website inside a docker container.


## To create a new repository out of here:



## 1. Projekt klonen

`git clone <URL-des-ursprungs-repo>`

`cd <projektordner>`

## 2. Bestehende Verbindung (Remote) entfernen

Damit Sie nicht versehentlich Änderungen in das ursprüngliche Projekt pushen, müssen Sie den origin-Remote entfernen. 

`git remote remove origin`

## 3. Neues Repository auf GitHub erstellen
Gehen Sie auf GitHub und erstellen Sie ein neues, leeres Repository.
Kopieren Sie die URL des neuen Repositorys (HTTPS oder SSH).

## 4. Änderungen vornehmen 
Bearbeiten Sie die Dateien im lokalen Ordner nach Ihren Wünschen. 

## 5. Neues Repository lokal initialisieren und pushen 
Verknüpfen Sie das lokale Verzeichnis mit dem neuen Repository und laden Sie die Änderungen hoch: 

Optional: Falls Sie den Branch umbenennen wollen (z.B. von master zu main):

`git branch -M main`

Neuen Remote hinzufügen:

`git remote add origin <URL-des-neuen-repo>`

Änderungen hinzufügen und committen

`git add .`


`git commit -m "Erster Commit im neuen Repository"`



Änderungen hochladen

`git push -u origin main`


# To start and run docker container:

`docker compose up --build -d 2>&1`
